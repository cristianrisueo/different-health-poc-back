import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

import { ChatbotMessage } from '../../models/ChatbotMessage.model';
import { QdrantService } from '../../utils/QdrantService.util';
import { ChatResponse, DocumentSource } from './Chatbot.interface';

export class ChatbotService {
  private static embeddings = new OpenAIEmbeddings();
  private static llm = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0.1,
  });

  static async askWithRAG(
    message: string, 
    patientId: string, 
    userId?: string
  ): Promise<ChatResponse> {
    try {
      console.log('🤖 Starting RAG query for patient:', patientId);
      console.log('❓ Question:', message);

      // Generate embedding for the user's question
      console.log('🔄 Generating embedding for question...');
      let questionEmbedding: number[];
      try {
        questionEmbedding = await this.embeddings.embedQuery(message);
        console.log('✅ Embedding generated, length:', questionEmbedding.length);
      } catch (embeddingError) {
        console.error('❌ OpenAI embedding error:', embeddingError);
        throw new Error(`OpenAI embedding failed: ${embeddingError.message}`);
      }

      // Search for relevant documents in Qdrant using patient-filtered search
      console.log('🔍 Searching Qdrant for similar documents...');
      let searchResults;
      try {
        searchResults = await QdrantService.searchSimilar(questionEmbedding, patientId, 5);
        console.log('📊 Found search results:', searchResults.length);
      } catch (qdrantError) {
        console.error('❌ Qdrant search error:', qdrantError);
        throw new Error(`Qdrant search failed: ${qdrantError.message}`);
      }

      // Generate conversation ID for follow-up
      const conversationId = uuidv4();

      // If no relevant documents found
      if (searchResults.length === 0) {
        const response = `No encuentro documentos médicos relevantes para tu consulta en tu historial. 

Para poder ayudarte con información específica sobre tu salud, necesito que:
1. Subas tus documentos médicos (análisis, estudios, reportes)
2. Realices consultas específicas basadas en esos documentos

¿Te gustaría que te ayude con algo más general sobre salud o tienes documentos que necesitas subir?`;

        // Save conversation without medical context
        await this.saveConversation(conversationId, userId, message, response, patientId);

        return {
          success: true,
          response,
          sources: [],
          conversationId,
        };
      }

      // Prepare context from relevant document chunks
      const documentContext = searchResults
        .map((result, index) => {
          return `DOCUMENTO ${index + 1} - ${result.payload.documentName}:
${result.payload.content}

---`;
        })
        .join('\n');

      // Generate medical response using enhanced prompt
      const medicalPrompt = ChatPromptTemplate.fromTemplate(`
Eres un asistente médico especializado que analiza documentos médicos del paciente. 

CARACTERÍSTICAS IMPORTANTES:
- Respondes EXCLUSIVAMENTE en español
- Eres empático, profesional y claro en tus explicaciones
- Te basas ÚNICAMENTE en los documentos médicos proporcionados
- Explicas términos médicos de manera comprensible
- Si no encuentras información específica, lo dices claramente
- SIEMPRE recomiendas consultar con el médico tratante

INSTRUCCIONES ESPECÍFICAS:
- Analiza cuidadosamente los documentos médicos proporcionados
- Responde a la pregunta del paciente basándote en esos documentos
- Si los documentos no contienen la información solicitada, explica qué tipo de estudio o análisis sería necesario
- Proporciona recomendaciones generales cuando sea apropiado
- Usa un tono comprensivo y profesional

DOCUMENTOS MÉDICOS DEL PACIENTE:
{context}

PREGUNTA DEL PACIENTE: {question}

RESPUESTA (en español, profesional y empática):
`);

      const chain = medicalPrompt.pipe(this.llm);
      const response = await chain.invoke({
        context: documentContext,
        question: message,
      });

      // Prepare sources for response
      const sources: DocumentSource[] = searchResults.map((result) => ({
        documentName: result.payload.documentName,
        relevantContent: result.payload.content.substring(0, 200) + '...',
        confidence: result.score,
      }));

      const finalResponse = response.content as string;

      // Save conversation with medical context
      await this.saveConversation(conversationId, userId, message, finalResponse, patientId, sources);

      console.log('✅ RAG response generated successfully');

      return {
        success: true,
        response: finalResponse,
        sources,
        conversationId,
      };
    } catch (error: any) {
      console.error('❌ Error in askWithRAG:', error);
      throw new Error(`Failed to process medical query: ${error.message}`);
    }
  }

  static async saveConversation(
    conversationId: string,
    userId: string | undefined,
    userMessage: string,
    assistantResponse: string,
    patientId: string,
    sources?: DocumentSource[]
  ): Promise<void> {
    try {
      if (!userId) return;

      const [userEmbedding, assistantEmbedding] = await this.embeddings.embedDocuments([
        userMessage,
        assistantResponse,
      ]);

      const userMessageDoc = {
        sessionId: conversationId,
        userId: new mongoose.Types.ObjectId(userId),
        patientId,
        role: 'user' as const,
        content: userMessage,
        embedding: userEmbedding,
        metadata: {
          timestamp: new Date(),
          hasDocumentContext: sources && sources.length > 0,
        },
      };

      const assistantMessageDoc = {
        sessionId: conversationId,
        userId: new mongoose.Types.ObjectId(userId),
        patientId,
        role: 'assistant' as const,
        content: assistantResponse,
        embedding: assistantEmbedding,
        metadata: {
          timestamp: new Date(),
          sources: sources || [],
          hasDocumentContext: sources && sources.length > 0,
        },
      };

      await ChatbotMessage.insertMany([userMessageDoc, assistantMessageDoc]);
      console.log('💾 Conversation saved successfully');
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
    }
  }

  // Legacy method for backwards compatibility
  static async invoke(params: { 
    input: string; 
    sessionId: string; 
    userId: string;
    patientId?: string;
  }): Promise<{ output: string }> {
    const { input, userId, patientId } = params;
    
    if (patientId) {
      const result = await this.askWithRAG(input, patientId, userId);
      return { output: result.response };
    }

    // Fallback for general health questions without patient context
    const generalResponse = `Hola! Soy tu asistente médico especializado. 

Para poder ayudarte con información específica sobre tu salud, necesito que proporciones tu ID de paciente y que hayas subido tus documentos médicos.

¿Te gustaría que te ayude con alguna consulta general sobre salud?`;

    return { output: generalResponse };
  }
}
