import { AuthRequest } from '../../interfaces/AuthRequest.interface';

export type AskRequest = AuthRequest<{
  Body: {
    message?: string;
    patientId?: string;
  };
}>;

export interface DocumentSource {
  documentName: string;
  relevantContent: string;
  confidence: number;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  sources?: DocumentSource[];
  conversationId?: string;
}
