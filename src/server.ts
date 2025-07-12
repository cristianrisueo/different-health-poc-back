import cors from '@fastify/cors';
import { fastifyHelmet } from '@fastify/helmet';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import multer from 'fastify-multer';
import mongoose, { ConnectOptions } from 'mongoose';

import routes from './routes';
import { QdrantService } from './utils/QdrantService.util';

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

    const options = {};

    const mongoURL = process.env.MONGO_ATLAS_URL || 'mongodb://127.0.0.1:27017/differenthealth';

    mongoose
      .connect(mongoURL, options as ConnectOptions)
      .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Initialize Qdrant vector database
        try {
          console.log('🛈 Initializing Qdrant vector database...');
          await QdrantService.ensureCollection();
          console.log('✅ Qdrant initialized successfully');
        } catch (qdrantError) {
          console.error('❌ Failed to initialize Qdrant:', qdrantError);
          console.log('⚠️ Vector search will not be available');
        }
      })
      .catch((err) => console.error('❌ Failed to connect to MongoDB', err));

    await server.listen({ port: (process.env.SERVER_PORT as any) || 8080, host: '0.0.0.0' });
    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log(`🚀 SERVER Running in: http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
