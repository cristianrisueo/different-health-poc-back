import { FastifyReply } from 'fastify';

import { AskRequest, ChatResponse } from './Chatbot.interface';
import { ChatbotService } from './Chatbot.service';

export class ChatbotController {
  static async ask(request: AskRequest, reply: FastifyReply) {
    try {
      console.log('🤖 Chatbot ask request received');
      console.log('📦 Body:', request.body);
      console.log('👤 User:', request.user || 'NO AUTH');

      const { message, patientId } = request.body;

      // Validate request
      if (!message || message.trim().length === 0) {
        console.log('❌ No message in request');
        return reply.status(400).send({
          success: false,
          error: 'Missing message',
          message: 'Message is required',
        });
      }

      if (!patientId) {
        console.log('❌ No patientId in request');
        return reply.status(400).send({
          success: false,
          error: 'Missing patientId',
          message: 'Patient ID is required for medical document queries',
        });
      }

      if (message.length > 1000) {
        console.log('❌ Message too long');
        return reply.status(400).send({
          success: false,
          error: 'Message too long',
          message: 'Message must be less than 1000 characters',
        });
      }

      console.log('✅ Validation passed, processing RAG query...');
      console.log('❓ Message:', message);
      console.log('👤 Patient ID:', patientId);

      // Use the new RAG service with patient-filtered document search
      const result: ChatResponse = await ChatbotService.askWithRAG(
        message, 
        patientId, 
        request.user?._id?.toString()
      );

      console.log('🎉 RAG query processed successfully');
      console.log('📊 Sources found:', result.sources?.length || 0);

      reply.send(result);
    } catch (error: any) {
      console.error('❌ Error in chatbot controller:', error);
      console.error('❌ Stack trace:', error.stack);

      if (error.message.includes('Patient ID not found') || error.message.includes('No documents found')) {
        return reply.status(404).send({
          success: false,
          error: 'No documents found',
          message: 'No medical documents found for this patient. Please upload documents first.',
        });
      }

      reply.status(500).send({
        success: false,
        error: 'Query failed',
        message: 'Failed to process your medical query. Please try again.',
        details: error.message,
      });
    }
  }

  // Legacy method for backwards compatibility
  static async askLegacy(request: AskRequest, reply: FastifyReply) {
    try {
      const { message, patientId } = request.body;

      const result = await ChatbotService.invoke({
        input: message || '',
        userId: request.user?._id?.toString() || '',
        sessionId: '123',
        patientId,
      });

      reply.send({ response: result.output });
    } catch (error) {
      console.error('Error in legacy chatbot controller:', error);
      reply.status(500).send({ error: 'Failed to get response' });
    }
  }
}
