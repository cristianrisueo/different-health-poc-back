import pdfParse from 'pdf-parse';

export interface PdfProcessorResult {
  text: string;
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

export class PdfProcessor {
  static async extractText(buffer: Buffer): Promise<PdfProcessorResult> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        text: data.text,
        totalPages: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        },
      };
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  static validatePdf(buffer: Buffer): boolean {
    // Check PDF header
    const header = buffer.slice(0, 4).toString();
    return header === '%PDF';
  }

  static estimateDocumentType(text: string, filename: string): string {
    const lowercaseText = text.toLowerCase();
    const lowercaseFilename = filename.toLowerCase();
    
    // Check filename first
    if (lowercaseFilename.includes('dexa') || lowercaseFilename.includes('dxa')) {
      return 'DEXA';
    }
    if (lowercaseFilename.includes('vo2') || lowercaseFilename.includes('cardio')) {
      return 'VO2';
    }
    if (lowercaseFilename.includes('hrv') || lowercaseFilename.includes('heart rate')) {
      return 'HRV';
    }
    if (lowercaseFilename.includes('blood') || lowercaseFilename.includes('lab')) {
      return 'LAB';
    }
    
    // Check content for common medical terms
    if (lowercaseText.includes('bone density') || 
        lowercaseText.includes('body composition') || 
        lowercaseText.includes('lean mass')) {
      return 'DEXA';
    }
    
    if (lowercaseText.includes('vo2 max') || 
        lowercaseText.includes('cardio') || 
        lowercaseText.includes('fitness test')) {
      return 'VO2';
    }
    
    if (lowercaseText.includes('heart rate variability') || 
        lowercaseText.includes('hrv') || 
        lowercaseText.includes('autonomic')) {
      return 'HRV';
    }
    
    if (lowercaseText.includes('blood test') || 
        lowercaseText.includes('laboratory') || 
        lowercaseText.includes('biomarker')) {
      return 'LAB';
    }
    
    return 'GENERAL';
  }
}