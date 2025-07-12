import { FastifyRequest } from 'fastify';

export type AuthRequest<T> = FastifyRequest<T> & {
  user: any;
};

export type AuthRequestWithUserIdParam = AuthRequest<{
  Params?: {
    userId?: string;
    email?: string;
  };
}>;
