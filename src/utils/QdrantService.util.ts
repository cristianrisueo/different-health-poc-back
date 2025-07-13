const { QdrantClient } = require('@qdrant/js-client-rest');
import { v4 as uuidv4 } from 'uuid';

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    patientId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    content: string;
    metadata: {
      pageNumber?: number;
      documentType?: string;
      uploadDate: string;
    };
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: QdrantPoint['payload'];
}

export class QdrantService {
  private static client: any; // ← Fix: usar 'any' en lugar del tipo
  private static readonly COLLECTION_NAME = 'medical_documents';

  static initialize() {
    if (!this.client) {
      this.client = new QdrantClient({
        url: process.env.QDRANT_URL!,
        apiKey: process.env.QDRANT_API_KEY!,
      });
    }
  }

  static async ensureCollection() {
    try {
      this.initialize();

      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some((col) => col.name === this.COLLECTION_NAME);

      if (!collectionExists) {
        console.log(`🛈 Creating Qdrant collection: ${this.COLLECTION_NAME}`);

        await this.client.createCollection(this.COLLECTION_NAME, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine',
          },
        });

        console.log(`✅ Qdrant collection created successfully`);
      } else {
        console.log(`✅ Qdrant collection already exists`);
      }
    } catch (error) {
      console.error('❌ Error setting up Qdrant collection:', error);
      throw error;
    }
  }

  static async addPoints(points: QdrantPoint[]): Promise<void> {
    try {
      this.initialize();

      const qdrantPoints = points.map((point) => ({
        id: uuidv4(), // ← FIX: Generar UUID único para cada punto
        vector: point.vector,
        payload: {
          ...point.payload,
          originalId: point.id, // ← Guardar el ID original en el payload
        },
      }));

      console.log(`📝 Adding ${qdrantPoints.length} points to Qdrant`);
      console.log(
        `🔑 Sample IDs:`,
        qdrantPoints.slice(0, 2).map((p) => p.id),
      );

      await this.client.upsert(this.COLLECTION_NAME, {
        wait: true,
        points: qdrantPoints,
      });

      console.log(`✅ Added ${points.length} points to Qdrant`);
    } catch (error) {
      console.error('❌ Error adding points to Qdrant:', error);
      throw error;
    }
  }

  static async searchSimilar(queryVector: number[], patientId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      this.initialize();

      const searchResult = await this.client.search(this.COLLECTION_NAME, {
        vector: queryVector,
        limit,
        filter: {
          must: [
            {
              key: 'patientId',
              match: { value: patientId },
            },
          ],
        },
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as QdrantPoint['payload'],
      }));
    } catch (error) {
      console.error('❌ Error searching in Qdrant:', error);
      throw error;
    }
  }

  static async deleteByPatient(patientId: string): Promise<void> {
    try {
      this.initialize();

      await this.client.delete(this.COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'patientId',
              match: { value: patientId },
            },
          ],
        },
      });

      console.log(`✅ Deleted all documents for patient: ${patientId}`);
    } catch (error) {
      console.error('❌ Error deleting patient documents from Qdrant:', error);
      throw error;
    }
  }

  static async deleteByDocument(documentId: string, patientId: string): Promise<void> {
    try {
      this.initialize();

      await this.client.delete(this.COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: 'patientId',
              match: { value: patientId },
            },
            {
              key: 'documentId',
              match: { value: documentId },
            },
          ],
        },
      });

      console.log(`✅ Deleted document ${documentId} for patient ${patientId}`);
    } catch (error) {
      console.error('❌ Error deleting document from Qdrant:', error);
      throw error;
    }
  }

  static async getCollectionInfo() {
    try {
      this.initialize();
      const info = await this.client.getCollection(this.COLLECTION_NAME);
      return info;
    } catch (error) {
      console.error('❌ Error getting collection info:', error);
      throw error;
    }
  }
}
