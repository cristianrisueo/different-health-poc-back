import { FastifyReply } from 'fastify';

import { DocumentsService } from './Documents.service';
import { UploadDocumentRequest, QueryDocumentRequest, ListDocumentsRequest } from './Documents.interface';

export class DocumentsController {
  static async uploadDocument(request: UploadDocumentRequest, reply: FastifyReply) {
    try {
      console.log('📝 Upload request received');
      console.log('📦 Body:', request.body);
      console.log('📎 File present:', request.file ? 'YES' : 'NO');
      console.log('👤 User:', request.user || 'NO AUTH');

      const { patientId } = request.body;
      const file = request.file;

      // Validate request
      if (!file) {
        console.log('❌ No file in request');
        return reply.status(400).send({
          error: 'No file uploaded',
          message: 'Please provide a PDF file to upload',
        });
      }

      if (!patientId) {
        console.log('❌ No patientId in request');
        return reply.status(400).send({
          error: 'Missing patientId',
          message: 'Patient ID is required',
        });
      }

      if (file.mimetype !== 'application/pdf') {
        console.log('❌ Invalid file type:', file.mimetype);
        return reply.status(400).send({
          error: 'Invalid file type',
          message: 'Only PDF files are supported',
        });
      }

      console.log('✅ Validation passed, processing document...');
      console.log('📄 File details:', {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
      });

      // Process the document
      const result = await DocumentsService.uploadDocument(file.buffer, file.originalname, patientId);

      console.log('🎉 Document processed successfully');

      reply.send({
        success: true,
        message: 'Document uploaded and processed successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Error in uploadDocument:', error);
      console.error('❌ Stack trace:', error.stack);

      if (error.message.includes('Invalid PDF') || error.message.includes('no extractable text')) {
        return reply.status(400).send({
          error: 'Invalid document',
          message: error.message,
        });
      }

      reply.status(500).send({
        error: 'Upload failed',
        message: 'Failed to process the document. Please try again.',
        details: error.message, // ← Añadir detalles para debugging
      });
    }
  }

  static async queryDocuments(request: QueryDocumentRequest, reply: FastifyReply) {
    try {
      const { patientId, question } = request.body;

      // Validate request
      if (!patientId) {
        return reply.status(400).send({
          error: 'Missing patientId',
          message: 'Patient ID is required',
        });
      }

      if (!question || question.trim().length === 0) {
        return reply.status(400).send({
          error: 'Missing question',
          message: 'Question is required',
        });
      }

      if (question.length > 1000) {
        return reply.status(400).send({
          error: 'Question too long',
          message: 'Question must be less than 1000 characters',
        });
      }

      // Query documents
      const result = await DocumentsService.queryDocuments(patientId, question);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in queryDocuments:', error);
      reply.status(500).send({
        error: 'Query failed',
        message: 'Failed to query documents. Please try again.',
      });
    }
  }

  static async listDocuments(request: ListDocumentsRequest, reply: FastifyReply) {
    try {
      const { patientId } = request.params;

      // Validate request
      if (!patientId) {
        return reply.status(400).send({
          error: 'Missing patientId',
          message: 'Patient ID is required',
        });
      }

      // Get documents and stats
      const [documents, stats] = await Promise.all([
        DocumentsService.listDocuments(patientId),
        DocumentsService.getDocumentStats(patientId),
      ]);

      reply.send({
        success: true,
        data: {
          documents,
          stats,
        },
      });
    } catch (error) {
      console.error('Error in listDocuments:', error);
      reply.status(500).send({
        error: 'List failed',
        message: 'Failed to retrieve documents. Please try again.',
      });
    }
  }

  static async downloadDocument(request: any, reply: FastifyReply) {
    try {
      const { documentId } = request.params;
      const { patientId } = request.query;

      // Validate request
      if (!documentId) {
        return reply.status(400).send({
          error: 'Missing documentId',
          message: 'Document ID is required',
        });
      }

      if (!patientId) {
        return reply.status(400).send({
          error: 'Missing patientId',
          message: 'Patient ID is required',
        });
      }

      // Get document
      const document = await DocumentsService.getDocument(documentId, patientId);

      if (!document) {
        return reply.status(404).send({
          error: 'Document not found',
          message: 'Document not found for this patient',
        });
      }

      // Set appropriate headers for PDF download
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${document.documentName}"`);
      reply.header('Content-Length', document.fileSize.toString());

      // Send the PDF buffer
      reply.send(document.originalBuffer);
    } catch (error) {
      console.error('Error in downloadDocument:', error);
      reply.status(500).send({
        error: 'Download failed',
        message: 'Failed to download document. Please try again.',
      });
    }
  }

  static async deleteDocument(request: any, reply: FastifyReply) {
    try {
      const { documentId } = request.params;
      const { patientId } = request.query;

      // Validate request
      if (!documentId) {
        return reply.status(400).send({
          error: 'Missing documentId',
          message: 'Document ID is required',
        });
      }

      if (!patientId) {
        return reply.status(400).send({
          error: 'Missing patientId',
          message: 'Patient ID is required',
        });
      }

      // Delete document
      const success = await DocumentsService.deleteDocument(documentId, patientId);

      if (!success) {
        return reply.status(404).send({
          error: 'Document not found',
          message: 'Document not found for this patient',
        });
      }

      reply.send({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      reply.status(500).send({
        error: 'Delete failed',
        message: 'Failed to delete document. Please try again.',
      });
    }
  }
}
