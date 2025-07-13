import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  documentId: string;
  patientId: string;
  documentName: string;
  fileSize: number;
  documentType: string;
  originalBuffer: Buffer;
  metadata: {
    uploadDate: Date;
    mimeType: string;
    totalChunks: number;
  };
}

const DocumentSchema = new Schema<IDocument>({
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  documentName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  documentType: {
    type: String,
    required: true,
  },
  originalBuffer: {
    type: Buffer,
    required: true,
  },
  metadata: {
    uploadDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    totalChunks: {
      type: Number,
      required: true,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

// Index for patient-specific queries
DocumentSchema.index({ patientId: 1, documentId: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);