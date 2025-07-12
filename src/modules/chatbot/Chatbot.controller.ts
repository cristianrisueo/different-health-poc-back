import { FastifyReply } from 'fastify';

import { AskRequest } from './Chatbot.interface';
import { ChatbotService } from './Chatbot.service';

export const ask = async (request: AskRequest, reply: FastifyReply) => {
  try {
    const { message } = request.body;

    const result = await ChatbotService.invoke({
      input: message,
      userId: request.user._id.toString(),
      sessionId: '123', //TODO: change to a random string
    });

    reply.send({ response: result.output });
  } catch (error) {
    console.error('Error in chatbot controller:', error);
    reply.status(500).send({ error: 'Failed to get response' });
  }
};

export const ChatbotController = { ask };
