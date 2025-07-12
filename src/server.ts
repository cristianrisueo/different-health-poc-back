import cors from '@fastify/cors';
import { fastifyHelmet } from '@fastify/helmet';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import multer from 'fastify-multer';
import mongoose, { ConnectOptions } from 'mongoose';

import routes from './routes';

require('dotenv').config();
require('module-alias/register');

dotenv.config();

let server;

const start = async () => {
  try {
    server = Fastify({ logger: true });
    await server.register(fastifyHelmet, { global: true });
    await server.register(multer.contentParser);
    await server.register(cors);
    await server.register(routes, { prefix: '/v1' });

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    const mongoURL = process.env.MONGO_ATLAS_URL || 'mongodb://127.0.0.1:27017/differenthealth';

    mongoose
      .connect(mongoURL, options as ConnectOptions)
      .then(async () => {
        console.log('Connected to MongoDB');

        // Create vector search indexes for both collections
        const chatbotColl = mongoose.connection.db.collection('chatbotmessages');
        const documentsColl = mongoose.connection.db.collection('documentchunks');
        
        // Check and create chatbot messages index
        const chatbotIndexName = 'default';
        const chatbotIndexes = await chatbotColl
          .listSearchIndexes(chatbotIndexName)
          .toArray()
          .catch(() => []);

        if (chatbotIndexes.length === 0) {
          console.log('🛈 Chatbot vector index not found, creating…');

          await chatbotColl.createSearchIndex({
            name: chatbotIndexName,
            definition: {
              fields: [
                {
                  type: 'vector',
                  path: 'embedding',
                  numDimensions: 1536,
                  similarity: 'cosine',
                },
                {
                  type: 'string',
                  path: 'content',
                },
              ],
            },
          });

          console.log('🛈 Chatbot index submitted: it will take 1-3 min to be ACTIVE.');
        } else {
          console.log('🛈 Chatbot vector index already exists.');
        }

        // Check and create documents search index
        const documentsIndexName = 'document_search';
        const documentsIndexes = await documentsColl
          .listSearchIndexes(documentsIndexName)
          .toArray()
          .catch(() => []);

        if (documentsIndexes.length === 0) {
          console.log('🛈 Documents vector index not found, creating…');

          await documentsColl.createSearchIndex({
            name: documentsIndexName,
            definition: {
              fields: [
                {
                  type: 'vector',
                  path: 'embedding',
                  numDimensions: 1536,
                  similarity: 'cosine',
                },
                {
                  type: 'string',
                  path: 'patientId',
                },
                {
                  type: 'string',
                  path: 'content',
                },
                {
                  type: 'string',
                  path: 'documentName',
                },
              ],
            },
          });

          console.log('🛈 Documents index submitted: it will take 1-3 min to be ACTIVE.');
        } else {
          console.log('🛈 Documents vector index already exists.');
        }
      })
      .catch((err) => console.error('Failed to connect to MongoDB', err));

    await server.listen({ port: (process.env.SERVER_PORT as any) || 8080, host: '0.0.0.0' });
    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log(`SERVER Running in: http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
