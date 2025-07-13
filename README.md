# Medical Document Management System with Vector Search

A comprehensive Fastify-based Node.js API server designed for managing medical documents with AI-powered vector search capabilities. This system enables patients to upload PDF documents and query their contents using advanced natural language processing and vector similarity search.

## 🚀 Features

### Core Functionality
- **PDF Document Upload**: Secure upload of medical documents with patient-specific storage
- **AI-Powered Vector Search**: Query documents using natural language with semantic understanding
- **Patient Data Isolation**: Complete segregation of patient data for privacy and security
- **Multi-format Support**: Handles various medical document types (DEXA, VO2, HRV, LAB, GENERAL)
- **Real-time Processing**: Automatic text extraction, chunking, and embedding generation

### Technical Capabilities
- **Semantic Text Chunking**: Intelligent document segmentation with configurable overlap
- **Vector Embeddings**: OpenAI-powered embeddings for accurate similarity search
- **Dual Vector Indexes**: Separate indexes for documents and chatbot conversations
- **RESTful API**: Clean, versioned API endpoints with comprehensive validation
- **JWT Authentication**: Secure access control for all operations

## 🏗️ Architecture

### Technology Stack
- **Backend**: Fastify (Node.js/TypeScript)
- **Database**: MongoDB with Atlas Vector Search
- **AI/ML**: LangChain + OpenAI (embeddings & chat completion)
- **Document Processing**: pdf-parse for text extraction
- **Security**: Helmet, CORS, JWT authentication

### Core Components

#### Document Management (`/src/modules/documents/`)
- **Upload Service**: PDF processing, text extraction, and chunk generation
- **Query Service**: Vector search with patient filtering and AI response generation
- **Document Controller**: RESTful endpoints for CRUD operations

#### Vector Search Architecture
1. **Document Chunks Collection**: Patient-specific document fragments with embeddings
2. **Chatbot Messages Collection**: General conversation history
3. **Atlas Vector Search**: 1536-dimension cosine similarity search with filtering

#### Data Models
- **DocumentChunk**: Text chunks with patient ID, embeddings, and metadata
- **ChatbotMessage**: Conversation history with vector embeddings

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with Vector Search enabled
- OpenAI API key
- TypeScript knowledge for development

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   
   # JWT
   JWT_SECRET=your_jwt_secret_here
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **MongoDB Atlas Vector Search Setup**
   
   Create two vector search indexes in your MongoDB Atlas cluster:
   
   **Document Search Index** (`documentchunks` collection):
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       },
       {
         "type": "filter",
         "path": "patientId"
       }
     ]
   }
   ```
   
   **Chatbot Index** (`chatbotmessages` collection):
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       }
     ]
   }
   ```

## 🚀 Getting Started

### Development Server
```bash
# Start development server with hot reload
npm run dev

# Windows users (legacy watch mode)
npm run win-dev

# Direct execution
npm start
```

### Production Build
```bash
# Build TypeScript
npm run build

# Start production server
npm run start:production
```

### Testing
```bash
# Run tests with coverage and watch mode
npm test

# Clean build directory
npm run clean
```

## 📚 API Documentation

### Base URL
All endpoints are prefixed with `/v1`

### Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Document Endpoints

#### Upload Document
```http
POST /v1/documents/upload
Content-Type: multipart/form-data

{
  "file": <pdf-file>,
  "patientId": "patient123",
  "documentType": "LAB"
}
```

#### Query Documents
```http
POST /v1/documents/query
Content-Type: application/json

{
  "patientId": "patient123",
  "query": "What were my latest blood test results?",
  "limit": 5
}
```

#### List Patient Documents
```http
GET /v1/documents/patient/patient123
```

#### Delete Document
```http
DELETE /v1/documents/:documentId
```

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: MongoDB Atlas connection string with vector search
- `OPENAI_API_KEY`: OpenAI API key for embeddings and chat
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Document Processing Settings
- **Max File Size**: 10MB per PDF
- **Chunk Size**: 1000 tokens maximum
- **Chunk Overlap**: 100 tokens
- **Supported Formats**: PDF only
- **Document Types**: DEXA, VO2, HRV, LAB, GENERAL

## 🔒 Security Features

- **Patient Data Isolation**: Database-level filtering by patient ID
- **File Validation**: PDF format and size restrictions
- **JWT Authentication**: Secure API access
- **Input Sanitization**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: HTTP security headers

## 🗂️ Project Structure

```
src/
├── server.ts                 # Entry point and server setup
├── routes/
│   └── index.ts             # Route registration
├── modules/
│   ├── documents/           # Document management module
│   │   ├── Document.controller.ts
│   │   ├── Document.service.ts
│   │   ├── Document.route.ts
│   │   └── models/
│   └── chatbot/            # Chatbot functionality
├── utils/
│   ├── PdfProcessor.util.ts # PDF text extraction
│   └── ChunkingStrategy.util.ts # Text chunking logic
└── config/                 # Configuration files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the CLAUDE.md file for development guidance

## 🔄 Version History

- **v1.0.0**: Initial release with core document management and vector search functionality