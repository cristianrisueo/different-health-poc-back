import { AuthRequest } from '../../interfaces/AuthRequest.interface';

export type AskRequest = AuthRequest<{
  Body: {
    message?: string;
  };
}>;
