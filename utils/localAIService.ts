import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { createWorker } from 'tesseract.js';

interface ReceiptData {
  name?: string;
  amount?: number;
  vatRate?: number;
  date?: string;
}

interface ProcessingResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
}

// Common Dutch company names and patterns
const COMMON_COMPANIES = [
  'albert heijn', 'ah', 'jumbo', 'lidl', 'aldi', 'plus', 'coop', 'spar',
  'action', 'hema', 'blokker', 'kruidvat', 'etos', 'da', 'drogisterij',
  'mediamarkt', 'coolblue', 'bol.com', 'wehkamp', 'zalando',
  'shell', 'bp', 'esso', 'texaco', 'total',
  'mcdonalds', 'burger king', 'kfc', 'subway', 'dominos',
  'ikea', 'gamma', 'karwei', 'hornbach', 'praxis',
  'restaurant', 'cafe', 'bar', 'hotel', 'tankstation'
];

// Common Dutch words that indicate amounts
const AMOUNT_INDICATORS = [
  'totaal', 'total', 'bedrag', 'te betalen', 'subtotaal', 'eindtotaal',
  'som', 'saldo', 'rekening', 'factuur', 'bon', 'euro', 'eur', '€'
];

// Common Dutch date patterns
const DATE_PATTERNS = [
  /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b/g, // DD-MM-YYYY or DD/MM/YYYY
  /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/g, // YYYY-MM-DD or YYYY/MM/DD
  /\b(\d{1,2})\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+(\d{4})\b/gi, // DD MMM YYYY
];

// VAT rate patterns
const VAT_PATTERNS = [
  { rate: 21, keywords: ['21%', '21 %', 'btw 21', 'hoog tarief', 'normaal tarief'] },
  { rate: 9, keywords: ['9%', '9 %', 'btw 9', 'laag tarief', 'gereduceerd tarief'] },
  { rate: 0, keywords: ['0%', '0 %', 'btw 0', 'vrijgesteld', 'geen btw'] }
];

// Real OCR engine using Tesseract.js
class LocalOCREngine {
  private worker: any = null;
  private isInitialized = false;

  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      console.log('Initializing OCR worker...');
      this.worker = await createWorker('nld+eng'); // Dutch and English
      this.isInitialized = true;
      console.log('OCR worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('OCR initialisatie mislukt');
    }
  }

  private async extractTextFromImage(imageData: string): Promise<string> {
    try {
      await this.initializeWorker();
      
      console.log('Starting OCR text extraction...');
      const { data: { text } } = await this.worker.recognize(imageData);
      console.log('OCR extraction completed');
      console.log('Extracted text:', text.substring(0, 200) + '...');
      
      return text;
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw new Error('Tekst extractie mislukt');
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        console.log('OCR worker terminated');
      } catch (error) {
        console.error('Error terminating OCR worker:', error);
      }
    }
  }

  private extractCompanyName(text: string): string | undefined {
    const lines = text.toLowerCase().split('\n');
    
    // Look for known company names
    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      for (const company of COMMON_COMPANIES) {
        if (line.includes(company)) {
          return this.capitalizeWords(company);
        }
      }
    }

    // If no known company found, try to extract from first meaningful line
    for (const line of lines.slice(0, 3)) {
      const cleaned = line.trim();
      if (cleaned.length > 3 && cleaned.length < 50 && !this.isAmountLine(cleaned)) {
        return this.capitalizeWords(cleaned);
      }
    }

    return undefined;
  }

  private extractAmount(text: string): number | undefined {
    const lines = text.split('\n');
    const amounts: number[] = [];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Look for total amount indicators
      const hasAmountIndicator = AMOUNT_INDICATORS.some(indicator => 
        lowerLine.includes(indicator)
      );

      if (hasAmountIndicator) {
        const amount = this.extractAmountFromLine(line);
        if (amount !== undefined) {
          amounts.push(amount);
        }
      }
    }

    // Also look for standalone amounts (usually the largest one is the total)
    for (const line of lines) {
      const amount = this.extractAmountFromLine(line);
      if (amount !== undefined && amount > 0.50) { // Ignore very small amounts
        amounts.push(amount);
      }
    }

    // Return the largest amount found (likely the total)
    return amounts.length > 0 ? Math.max(...amounts) : undefined;
  }

  private extractAmountFromLine(line: string): number | undefined {
    // Match various amount patterns: €12.34, 12,34, 12.34 EUR, etc.
    const amountPatterns = [
      /€\s*(\d+)[,.]?(\d{2})?/g,
      /(\d+)[,.]?(\d{2})\s*€/g,
      /(\d+)[,.]?(\d{2})\s*(eur|euro)/gi,
      /\b(\d+)[,.]?(\d{2})\b/g
    ];

    for (const pattern of amountPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        const euros = parseInt(match[1] || '0');
        const cents = parseInt(match[2] || '0');
        const amount = euros + (cents / 100);
        
        if (amount > 0 && amount < 10000) { // Reasonable range
          return amount;
        }
      }
    }

    return undefined;
  }

  private extractDate(text: string): string | undefined {
    for (const pattern of DATE_PATTERNS) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        try {
          let date: Date;
          
          if (match[0].includes('jan') || match[0].includes('feb')) {
            // Handle Dutch month names
            const monthMap: { [key: string]: number } = {
              'jan': 0, 'feb': 1, 'mrt': 2, 'apr': 3, 'mei': 4, 'jun': 5,
              'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11
            };
            const day = parseInt(match[1]);
            const month = monthMap[match[2].toLowerCase()];
            const year = parseInt(match[3]);
            date = new Date(year, month, day);
          } else if (match[1].length === 4) {
            // YYYY-MM-DD format
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            // DD-MM-YYYY format
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          }

          // Validate date is reasonable (not in future, not too old)
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          
          if (date <= now && date >= oneYearAgo) {
            return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
          }
        } catch (error) {
          continue;
        }
      }
    }

    return undefined;
  }

  private extractVATRate(text: string): number {
    const lowerText = text.toLowerCase();
    
    for (const vatInfo of VAT_PATTERNS) {
      for (const keyword of vatInfo.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return vatInfo.rate;
        }
      }
    }

    // Default to 21% (most common in Netherlands)
    return 21;
  }

  private isAmountLine(line: string): boolean {
    return /\d+[,.]?\d{2}/.test(line) || line.includes('€') || line.includes('eur');
  }

  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async processImage(imageData: string): Promise<ReceiptData> {
    try {
      const text = await this.extractTextFromImage(imageData);
      return this.processText(text);
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }

  async processText(text: string): Promise<ReceiptData> {
    console.log('Processing extracted text for receipt data...');
    
    const name = this.extractCompanyName(text);
    const amount = this.extractAmount(text);
    const date = this.extractDate(text);
    const vatRate = this.extractVATRate(text);

    console.log('Extracted data:', { name, amount, date, vatRate });

    return {
      name: name || 'Onbekend',
      amount: amount || 0,
      vatRate: vatRate,
      date: date || new Date().toISOString().split('T')[0]
    };
  }
}

// PDF text extraction (simplified)
class PDFProcessor {
  async extractTextFromPDF(base64PDF: string): Promise<string> {
    // This is a simplified PDF text extraction
    // In a real implementation, you would use a library like pdf-parse or PDF.js
    // For now, we'll return a placeholder
    console.log('PDF processing not fully implemented - would extract text here');
    return '';
  }
}

// Main local AI service
export class LocalAIService {
  private ocrEngine: LocalOCREngine;
  private pdfProcessor: PDFProcessor;

  constructor() {
    this.ocrEngine = new LocalOCREngine();
    this.pdfProcessor = new PDFProcessor();
  }

  async processReceiptImages(imageUris: string[]): Promise<ProcessingResult> {
    try {
      console.log(`Processing ${imageUris.length} images with OCR...`);
      
      if (imageUris.length === 0) {
        return {
          success: false,
          error: 'Geen afbeeldingen om te verwerken'
        };
      }

      // Process the first image (for multiple images, we could combine results)
      const uri = imageUris[0];
      console.log('Processing image:', uri);
      
      let imageData: string;
      
      if (Platform.OS === 'web') {
        // For web, we can use the URI directly if it's a blob URL
        // or convert it to base64 if needed
        if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          imageData = uri;
        } else {
          const base64 = await this.fileToBase64(uri);
          if (!base64) {
            throw new Error('Kon afbeelding niet converteren');
          }
          imageData = base64;
        }
      } else {
        // For mobile, convert to base64
        const base64 = await this.fileToBase64(uri);
        if (!base64) {
          throw new Error('Kon afbeelding niet converteren');
        }
        imageData = base64;
      }

      const extractedData = await this.ocrEngine.processImage(imageData);
      
      return {
        success: true,
        data: extractedData
      };

    } catch (error) {
      console.error('Error in OCR processing:', error);
      
      // Cleanup OCR worker on error
      try {
        await this.ocrEngine.cleanup();
      } catch (cleanupError) {
        console.error('Error cleaning up OCR worker:', cleanupError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout bij OCR verwerking'
      };
    }
  }

  async processPDF(pdfUri: string): Promise<ProcessingResult> {
    try {
      console.log('Processing PDF with OCR...');
      
      // For PDFs, we'll use OCR on the PDF pages
      // Tesseract.js can handle PDF files directly
      let pdfData: string;
      
      if (Platform.OS === 'web') {
        if (pdfUri.startsWith('blob:') || pdfUri.startsWith('data:')) {
          pdfData = pdfUri;
        } else {
          const base64 = await this.fileToBase64(pdfUri);
          if (!base64) {
            throw new Error('Kon PDF niet converteren');
          }
          pdfData = base64;
        }
      } else {
        const base64 = await this.fileToBase64(pdfUri);
        if (!base64) {
          throw new Error('Kon PDF niet converteren');
        }
        pdfData = base64;
      }

      const extractedData = await this.ocrEngine.processImage(pdfData);
      
      return {
        success: true,
        data: extractedData
      };

    } catch (error) {
      console.error('Error processing PDF with OCR:', error);
      
      // Cleanup OCR worker on error
      try {
        await this.ocrEngine.cleanup();
      } catch (cleanupError) {
        console.error('Error cleaning up OCR worker:', cleanupError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout bij PDF OCR verwerking'
      };
    }
  }

  private async fileToBase64(uri: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const mimeType = this.getMimeType(uri);
        return `data:${mimeType};base64,${base64}`;
      }
    } catch (error) {
      console.error('Error converting file to base64:', error);
      return null;
    }
  }

  private getMimeType(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.ocrEngine.cleanup();
    } catch (error) {
      console.error('Error cleaning up LocalAIService:', error);
    }
  }
}

// Export singleton instance
export const localAI = new LocalAIService();

// Legacy function for backward compatibility
export const processReceiptImagesLocal = async (
  imageUris: string[]
): Promise<ReceiptData | null> => {
  const result = await localAI.processReceiptImages(imageUris);
  return result.success ? result.data || null : null;
};