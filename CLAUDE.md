# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- `npm run dev` - Start development server with hot reload (Node.js/macOS/Linux)
- `npm run win-dev` - Start development server on Windows with legacy watch
- `npm start` - Run the app directly with ts-node (development)
- `npm run start:production` - Start production build

### Building and Testing
- `npm run build` - Compile TypeScript to dist/ directory
- `npm run clean` - Remove dist/ directory
- `npm test` - Run Jest tests with coverage and watch mode

## Architecture Overview

This is a Fastify-based Node.js API server for a **PDF document management system with vector search** designed for medical documents. The system allows patients to upload PDFs and query their contents using AI-powered vector search.

### Core Technologies
- **Fastify** - Web framework with built-in CORS, Helmet security, and multipart support for file uploads
- **MongoDB/Mongoose** - Database with Atlas Vector Search for embeddings
- **LangChain** - AI framework with OpenAI integration for document processing
- **pdf-parse** - PDF text extraction library
- **TypeScript** - Full TypeScript codebase

### Application Structure
- **Entry Point**: `src/server.ts` - Fastify server setup, MongoDB connection, and dual vector index management
- **Routes**: All routes are prefixed with `/v1` and registered in `src/routes/index.ts`
- **Modular Architecture**: Features organized in `src/modules/` with controller/service/route pattern

### Document Management System
The main feature is a patient-specific PDF document system:

#### Documents Module (`src/modules/documents/`)
- **Upload Endpoint** (`POST /v1/documents/upload`): 
  - Accepts PDF files up to 10MB with patient ID
  - Extracts text using pdf-parse
  - Chunks text semantically (1000 tokens max, 100 token overlap)
  - Generates OpenAI embeddings for each chunk
  - Stores with patient ID filtering

- **Query Endpoint** (`POST /v1/documents/query`):
  - Patient-specific vector search using MongoDB Atlas
  - Filters chunks by patient ID to prevent cross-contamination
  - Uses LangChain for contextual AI responses
  - Returns relevant document chunks with similarity scores

- **List/Delete Endpoints**: Patient-specific document management

#### Key Components
- **DocumentChunk Model**: Stores text chunks with patient ID indexing and embeddings
- **PDF Processing Utils**: `PdfProcessor.util.ts` for text extraction and document type detection
- **Chunking Strategy**: `ChunkingStrategy.util.ts` for semantic text splitting with overlap
- **Vector Search**: Patient-filtered similarity search with MongoDB Atlas

### Vector Search Architecture
The system maintains two MongoDB Atlas vector search indexes:

1. **Chatbot Messages** (`chatbotmessages` collection, `default` index):
   - General conversation history
   - 1536-dimension embeddings with cosine similarity

2. **Document Chunks** (`documentchunks` collection, `document_search` index):
   - Patient-specific document chunks
   - Filtered vector search by `patientId`
   - Supports multiple document types (DEXA, VO2, HRV, LAB, GENERAL)

### Data Models
- **DocumentChunk** - Text chunks with patient ID, embeddings, and metadata
- **ChatbotMessage** - General conversation history with embeddings

### Security & Isolation
- **Patient Data Isolation**: All document queries are filtered by patient ID
- **File Validation**: PDF-only uploads with size limits
- **JWT Authentication**: Required for all document operations
- **Error Handling**: Comprehensive validation and error responses

### Processing Pipeline
1. **PDF Upload** → Text Extraction → Semantic Chunking → Embedding Generation → Database Storage
2. **Document Query** → Patient-Filtered Vector Search → LangChain Response Generation → Contextual Answer

### Environment Requirements
- MongoDB Atlas connection with vector search capabilities
- OpenAI API key for embeddings and chat completion
- Node.js environment with TypeScript compilation
- Sufficient storage for PDF processing and embeddings

The application automatically creates both vector search indexes on startup and ensures complete patient data isolation through database-level filtering.