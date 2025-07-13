import { FastifyInstance, FastifyReply } from 'fastify';

import { AuthMiddleware } from '../../middlewares/Auth.middleware';
import { CHATBOT_ROUTE_PREFIX } from './Chatbot.config';
import { ChatbotController } from './Chatbot.controller';
import { AskRequest } from './Chatbot.interface';

export default function ChatbotRoute(fastify: FastifyInstance, options: any, done: (err?: Error) => void) {
  // Main RAG endpoint with medical document search
  fastify.post(
    `${CHATBOT_ROUTE_PREFIX}/ask`,
    {
      // Temporarily disable auth for testing - enable in production
      // preHandler: [AuthMiddleware],
      schema: {
        body: {
          type: 'object',
          required: ['message', 'patientId'],
          properties: {
            message: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 1000,
              description: 'The medical question or query'
            },
            patientId: { 
              type: 'string', 
              minLength: 1,
              description: 'Patient ID for filtering medical documents'
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              response: { type: 'string' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    documentName: { type: 'string' },
                    relevantContent: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                },
              },
              conversationId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: AskRequest, reply: FastifyReply) => {
      return await ChatbotController.ask(request, reply);
    },
  );

  // Legacy endpoint for backwards compatibility
  fastify.post(
    `${CHATBOT_ROUTE_PREFIX}/ask-legacy`,
    {
      preHandler: [AuthMiddleware],
    },
    async (request: AskRequest, reply: FastifyReply) => {
      return await ChatbotController.askLegacy(request, reply);
    },
  );

  done();
}
