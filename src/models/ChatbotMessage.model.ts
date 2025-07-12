import mongoose from 'mongoose';

const ChatbotMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const ChatbotMessage = mongoose.model('ChatbotMessage', ChatbotMessageSchema);
