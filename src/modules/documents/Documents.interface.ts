import { FastifyRequest } from 'fastify';

export interface UploadDocumentRequest extends FastifyRequest {
  body: {
    patientId: string;
  };
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  };
  user: {
    _id: string;
  };
}

export interface QueryDocumentRequest extends FastifyRequest {
  body: {
    patientId: string;
    question: string;
  };
  user: {
    _id: string;
  };
}

export interface ListDocumentsRequest extends FastifyRequest {
  params: {
    patientId: string;
  };
  user: {
    _id: string;
  };
}

export interface ProcessedDocument {
  documentId: string;
  documentName: string;
  patientId: string;
  totalChunks: number;
  uploadDate: Date;
}

export interface DocumentChunkData {
  content: string;
  chunkIndex: number;
  metadata: {
    pageNumber?: number;
    documentType?: string;
  };
}

export interface QueryResult {
  answer: string;
  relevantChunks: {
    documentName: string;
    content: string;
    score: number;
  }[];
}