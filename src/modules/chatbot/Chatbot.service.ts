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

  static async askWithRAG(message: string, patientId: string, userId?: string): Promise<ChatResponse> {
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
        const response = `## 📋 No se encontraron documentos médicos relevantes

No se encontraron documentos médicos relevantes para esta consulta en el historial del paciente. 

### 📤 Para poder realizar el análisis médico necesita:

1. **Subir documentos médicos del paciente** (análisis, estudios, reportes, historiales)
2. **Realizar consultas específicas** basadas en esos documentos clínicos

### 💡 Opciones disponibles:

- Puede realizar **consultas generales sobre interpretación médica**
- Puede **subir documentos médicos** para análisis clínico específico
- Puede solicitar **orientación sobre tipos de estudios diagnósticos**

¿Necesita ayuda con alguna consulta médica general o tiene documentos del paciente para analizar? 📄`;

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

      // Generate medical response using enhanced prompt with Markdown formatting
      const medicalPrompt = ChatPromptTemplate.fromTemplate(`
Eres un asistente médico especializado que ayuda a médicos analizando documentos médicos de pacientes.

CARACTERÍSTICAS IMPORTANTES:
- Respondes EXCLUSIVAMENTE en inglés
- Eres profesional, preciso y claro en tus análisis médicos
- Te basas ÚNICAMENTE en los documentos médicos proporcionados
- Proporcionas análisis médicos detallados para profesionales de la salud
- Si no encuentras información específica, lo especificas claramente
- Ofreces interpretaciones clínicas relevantes para el diagnóstico y tratamiento

INSTRUCCIONES DE FORMATO MARKDOWN:
- Usa formato Markdown para estructurar tu respuesta de manera clara y profesional
- Incluye headers (##) para secciones principales
- Usa listas con bullets (-) y números (1.) donde sea apropiado
- Resalta datos importantes con **negrita**
- Usa emojis apropiados para mejorar la legibilidad (✅ ⚠️ 📊 💪 🏆 etc.)
- Estructura la información de forma clara y organizada

ESTRUCTURA SUGERIDA CUANDO SEA APROPIADO:
- Header principal con tipo de análisis o tema consultado
- Sección de datos del paciente si están disponibles
- Resultados principales organizados por categorías
- Interpretación clínica y hallazgos relevantes
- Sugerencias para seguimiento o estudios adicionales

INSTRUCCIONES ESPECÍFICAS:
- Analiza cuidadosamente los documentos médicos proporcionados
- Responde a la consulta médica basándote en esos documentos
- Si los documentos no contienen la información solicitada, indica qué tipo de estudio o análisis sería necesario
- Proporciona interpretaciones clínicas relevantes para el diagnóstico
- Usa terminología médica apropiada para profesionales de la salud
- Mantén un tono profesional y objetivo

DOCUMENTOS MÉDICOS DEL PACIENTE:
{context}

CONSULTA MÉDICA: {question}

ANÁLISIS MÉDICO (en inglés, profesional, objetivo y en formato Markdown estructurado):
`);

      const chain = medicalPrompt.pipe(this.llm);
      const response = await chain.invoke({
        context: documentContext,
        question: message,
      });

      // Prepare sources for response
      const sources: DocumentSource[] = searchResults.map((result) => ({
        documentName: result.payload.documentName,
        relevantContent:
          result.payload.content.length > 500
            ? result.payload.content.substring(0, 500) + '...'
            : result.payload.content,
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
    sources?: DocumentSource[],
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
    const generalResponse = `## 👋 ¡Hola! Soy su asistente médico especializado

### 📋 Para realizar análisis médicos necesito:

1. **ID del paciente** 
2. **Documentos médicos del paciente** (análisis, estudios, reportes, historiales)

### 💬 ¿En qué puedo ayudarle?

- **Consultas generales sobre interpretación médica**
- **Explicaciones sobre tipos de estudios diagnósticos**
- **Orientación sobre hallazgos clínicos**

¿Necesita ayuda con alguna consulta médica general? 🩺`;

    return { output: generalResponse };
  }
}
