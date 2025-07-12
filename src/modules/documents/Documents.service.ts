import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import { DocumentChunk, IDocumentChunk } from '../../models/DocumentChunk.model';
import { PdfProcessor } from '../../utils/PdfProcessor.util';
import { ChunkingStrategy } from '../../utils/ChunkingStrategy.util';
import { QdrantService, QdrantPoint } from '../../utils/QdrantService.util';
import { ProcessedDocument, DocumentChunkData, QueryResult } from './Documents.interface';

export class DocumentsService {
  private static embeddings = new OpenAIEmbeddings();
  private static llm = new ChatOpenAI({
    modelName: 'gpt-4-turbo-preview',
    temperature: 0,
  });

  static async uploadDocument(buffer: Buffer, filename: string, patientId: string): Promise<ProcessedDocument> {
    try {
      // Validate PDF
      if (!PdfProcessor.validatePdf(buffer)) {
        throw new Error('Invalid PDF file');
      }

      // Extract text from PDF
      const pdfResult = await PdfProcessor.extractText(buffer);

      if (!pdfResult.text || pdfResult.text.trim().length === 0) {
        throw new Error('PDF contains no extractable text');
      }

      // Generate unique document ID
      const documentId = uuidv4();

      // Estimate document type
      const documentType = PdfProcessor.estimateDocumentType(pdfResult.text, filename);

      // Chunk the text
      const chunks = ChunkingStrategy.chunkText(pdfResult.text, {
        maxTokens: 1000,
        overlapTokens: 100,
        preserveStructure: true,
      });

      if (chunks.length === 0) {
        throw new Error('Failed to create chunks from PDF text');
      }

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddings = await this.embeddings.embedDocuments(chunkTexts);

      // Prepare document chunks for MongoDB
      const documentChunks: Partial<IDocumentChunk>[] = chunks.map((chunk, index) => ({
        patientId,
        documentId,
        documentName: filename,
        chunkIndex: chunk.index,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: {
          pageNumber: Math.floor(chunk.metadata.startPosition / 2000) + 1,
          documentType,
          uploadDate: new Date(),
        },
      }));

      // Prepare points for Qdrant
      const qdrantPoints: QdrantPoint[] = chunks.map((chunk, index) => ({
        id: `${documentId}_${chunk.index}`,
        vector: embeddings[index],
        payload: {
          patientId,
          documentId,
          documentName: filename,
          chunkIndex: chunk.index,
          content: chunk.content,
          metadata: {
            pageNumber: Math.floor(chunk.metadata.startPosition / 2000) + 1,
            documentType,
            uploadDate: new Date().toISOString(),
          },
        },
      }));

      // Save to MongoDB (for document management)
      await DocumentChunk.insertMany(documentChunks);

      // Save to Qdrant (for vector search)
      await QdrantService.addPoints(qdrantPoints);

      return {
        documentId,
        documentName: filename,
        patientId,
        totalChunks: chunks.length,
        uploadDate: new Date(),
      };
    } catch (error: any) {
      console.error('Error processing document:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  static async queryDocuments(patientId: string, question: string): Promise<QueryResult> {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this.embeddings.embedQuery(question);

      // Perform vector search with Qdrant
      const searchResults = await QdrantService.searchSimilar(questionEmbedding, patientId, 5);

      if (searchResults.length === 0) {
        return {
          answer: 'No relevant documents found for this patient. Please upload medical documents first.',
          relevantChunks: [],
        };
      }

      // Prepare context from relevant chunks
      const context = searchResults
        .map((result) => `Document: ${result.payload.documentName}\nContent: ${result.payload.content}`)
        .join('\n\n---\n\n');

      // Generate answer using LLM
      const prompt = ChatPromptTemplate.fromTemplate(`
        You are a medical assistant helping analyze patient documents. Based on the provided medical documents, answer the user's question.

        IMPORTANT GUIDELINES:
        - Only answer based on the provided documents
        - If the information is not in the documents, clearly state that
        - Be precise and reference specific findings when available
        - Maintain professional medical language
        - Do not provide medical advice or diagnoses
        - If asked about data not in the documents, suggest what type of test or document would contain that information

        PATIENT DOCUMENTS:
        {context}

        QUESTION: {question}

        Please provide a comprehensive answer based solely on the available documents:
      `);

      const chain = prompt.pipe(this.llm);
      const response = await chain.invoke({
        context,
        question,
      });

      return {
        answer: response.content as string,
        relevantChunks: searchResults.map((result) => ({
          documentName: result.payload.documentName,
          content: result.payload.content.substring(0, 200) + '...',
          score: result.score,
        })),
      };
    } catch (error: any) {
      console.error('Error querying documents:', error);
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  static async listDocuments(patientId: string): Promise<ProcessedDocument[]> {
    try {
      const pipeline: any[] = [
        { $match: { patientId } },
        {
          $group: {
            _id: '$documentId',
            documentName: { $first: '$documentName' },
            patientId: { $first: '$patientId' },
            totalChunks: { $sum: 1 },
            uploadDate: { $first: '$metadata.uploadDate' },
          },
        },
        { $sort: { uploadDate: -1 } },
      ];

      const documents = await DocumentChunk.aggregate(pipeline);

      return documents.map((doc: any) => ({
        documentId: doc._id,
        documentName: doc.documentName,
        patientId: doc.patientId,
        totalChunks: doc.totalChunks,
        uploadDate: doc.uploadDate,
      }));
    } catch (error: any) {
      console.error('Error listing documents:', error);
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  static async deleteDocument(documentId: string, patientId: string): Promise<boolean> {
    try {
      // Delete from MongoDB
      const result = await DocumentChunk.deleteMany({
        documentId,
        patientId,
      });

      // Delete from Qdrant
      await QdrantService.deleteByDocument(documentId, patientId);

      return result.deletedCount > 0;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  static async getDocumentStats(patientId: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    documentTypes: { [key: string]: number };
  }> {
    try {
      const stats = await DocumentChunk.aggregate([
        { $match: { patientId } },
        {
          $group: {
            _id: null,
            totalChunks: { $sum: 1 },
            documentIds: { $addToSet: '$documentId' },
            documentTypes: { $push: '$metadata.documentType' },
          },
        },
      ] as any[]);

      if (stats.length === 0) {
        return {
          totalDocuments: 0,
          totalChunks: 0,
          documentTypes: {},
        };
      }

      const stat = stats[0];
      const documentTypeCounts = stat.documentTypes.reduce((acc: any, type: string) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalDocuments: stat.documentIds.length,
        totalChunks: stat.totalChunks,
        documentTypes: documentTypeCounts,
      };
    } catch (error: any) {
      console.error('Error getting document stats:', error);
      throw new Error(`Failed to get document stats: ${error.message}`);
    }
  }
}
