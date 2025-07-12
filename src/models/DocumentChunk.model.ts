import mongoose, { Document, Schema } from 'mongoose';

export interface IDocumentChunk extends Document {
  patientId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: {
    pageNumber?: number;
    documentType?: string;
    uploadDate: Date;
  };
}

const DocumentChunkSchema = new Schema<IDocumentChunk>({
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  documentId: {
    type: String,
    required: true,
    index: true,
  },
  documentName: {
    type: String,
    required: true,
  },
  chunkIndex: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  metadata: {
    pageNumber: {
      type: Number,
      required: false,
    },
    documentType: {
      type: String,
      required: false,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
}, {
  timestamps: true,
});

// Compound index for efficient patient-specific vector search
DocumentChunkSchema.index({ patientId: 1, embedding: 1 });

// Index for document-specific queries
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const DocumentChunk = mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);