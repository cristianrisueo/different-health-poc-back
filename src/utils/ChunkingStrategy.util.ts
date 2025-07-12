export interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
  preserveStructure?: boolean;
}

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    startPosition: number;
    endPosition: number;
    estimatedTokens: number;
  };
}

export class ChunkingStrategy {
  private static readonly DEFAULT_MAX_TOKENS = 1000;
  private static readonly DEFAULT_OVERLAP_TOKENS = 100;
  private static readonly APPROX_TOKENS_PER_CHAR = 0.25; // rough estimate for English text

  static chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const {
      maxTokens = this.DEFAULT_MAX_TOKENS,
      overlapTokens = this.DEFAULT_OVERLAP_TOKENS,
      preserveStructure = true,
    } = options;

    const maxChars = Math.floor(maxTokens / this.APPROX_TOKENS_PER_CHAR);
    const overlapChars = Math.floor(overlapTokens / this.APPROX_TOKENS_PER_CHAR);

    if (preserveStructure) {
      return this.semanticChunking(text, maxChars, overlapChars);
    } else {
      return this.simpleChunking(text, maxChars, overlapChars);
    }
  }

  private static semanticChunking(text: string, maxChars: number, overlapChars: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // First, split by double newlines (paragraphs)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentStartPos = 0;
    let globalPosition = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      if (potentialChunk.length <= maxChars) {
        // Add paragraph to current chunk
        if (currentChunk === '') {
          currentStartPos = globalPosition;
        }
        currentChunk = potentialChunk;
      } else {
        // Current chunk is full, finalize it
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index: chunkIndex++,
            metadata: {
              startPosition: currentStartPos,
              endPosition: currentStartPos + currentChunk.length,
              estimatedTokens: Math.ceil(currentChunk.length * this.APPROX_TOKENS_PER_CHAR),
            },
          });

          // Handle overlap for next chunk
          const overlapText = this.getOverlapText(currentChunk, overlapChars);
          currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph;
          currentStartPos = globalPosition - (overlapText ? overlapText.length + 2 : 0);
        } else {
          // Single paragraph is too long, split it
          const sentenceChunks = this.splitLongParagraph(paragraph, maxChars, overlapChars);
          for (const sentenceChunk of sentenceChunks) {
            chunks.push({
              content: sentenceChunk,
              index: chunkIndex++,
              metadata: {
                startPosition: globalPosition,
                endPosition: globalPosition + sentenceChunk.length,
                estimatedTokens: Math.ceil(sentenceChunk.length * this.APPROX_TOKENS_PER_CHAR),
              },
            });
            globalPosition += sentenceChunk.length;
          }
          currentChunk = '';
        }
      }

      globalPosition += paragraph.length + 2; // +2 for \n\n
    }

    // Add the last chunk if there's content
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index: chunkIndex,
        metadata: {
          startPosition: currentStartPos,
          endPosition: currentStartPos + currentChunk.length,
          estimatedTokens: Math.ceil(currentChunk.length * this.APPROX_TOKENS_PER_CHAR),
        },
      });
    }

    return chunks;
  }

  private static simpleChunking(text: string, maxChars: number, overlapChars: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < text.length) {
      const endPos = Math.min(startPos + maxChars, text.length);
      const content = text.slice(startPos, endPos);

      chunks.push({
        content,
        index: chunkIndex++,
        metadata: {
          startPosition: startPos,
          endPosition: endPos,
          estimatedTokens: Math.ceil(content.length * this.APPROX_TOKENS_PER_CHAR),
        },
      });

      startPos = endPos - overlapChars;
      if (startPos >= text.length) break;
    }

    return chunks;
  }

  private static splitLongParagraph(paragraph: string, maxChars: number, overlapChars: number): string[] {
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;

      if (potentialChunk.length <= maxChars) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
          
          // Handle overlap
          const overlapText = this.getOverlapText(currentChunk, overlapChars);
          currentChunk = overlapText + (overlapText ? '. ' : '') + trimmedSentence;
        } else {
          // Single sentence is too long, force split
          chunks.push(trimmedSentence.slice(0, maxChars));
          currentChunk = trimmedSentence.slice(maxChars - overlapChars);
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  private static getOverlapText(text: string, overlapChars: number): string {
    if (overlapChars >= text.length) return text;
    
    const overlapText = text.slice(-overlapChars);
    
    // Try to start the overlap at a word boundary
    const spaceIndex = overlapText.indexOf(' ');
    if (spaceIndex > 0) {
      return overlapText.slice(spaceIndex + 1);
    }
    
    return overlapText;
  }

  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length * this.APPROX_TOKENS_PER_CHAR);
  }
}