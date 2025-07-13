import { FastifyInstance } from 'fastify';
import multer from 'fastify-multer';

import { AuthMiddleware } from '../../middlewares/Auth.middleware';
import { DocumentsController } from './Documents.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

async function DocumentsRoute(fastify: FastifyInstance) {
  // Upload PDF document
  fastify.post('/documents/upload', {
    preHandler: [upload.single('file')],
    handler: DocumentsController.uploadDocument,
  });

  // Query documents for a patient
  fastify.post('/documents/query', {
    handler: DocumentsController.queryDocuments,
  });

  // List documents for a patient
  fastify.get('/documents/patient/:patientId', {
    handler: DocumentsController.listDocuments,
  });

  // Download a document
  fastify.get('/documents/:documentId/download', {
    handler: DocumentsController.downloadDocument,
  });

  // Delete a document
  fastify.delete('/documents/:documentId', {
    handler: DocumentsController.deleteDocument,
  });
}

export default DocumentsRoute;
