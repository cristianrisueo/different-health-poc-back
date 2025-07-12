import { FastifyInstance, FastifyReply } from 'fastify';

import { AuthMiddleware } from '../../middlewares/Auth.middleware';
import { CHATBOT_ROUTE_PREFIX } from './Chatbot.config';
import { ChatbotController } from './Chatbot.controller';
import { AskRequest } from './Chatbot.interface';

export default function ChatbotRoute(fastify: FastifyInstance, options: any, done: (err?: Error) => void) {
  fastify.post(
    `${CHATBOT_ROUTE_PREFIX}/ask`,
    {
      preHandler: [AuthMiddleware],
    },
    async (request: AskRequest, reply: FastifyReply) => {
      return await ChatbotController.ask(request, reply);
    },
  );

  done();
}
