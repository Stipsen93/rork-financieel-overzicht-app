import { Platform } from 'react-native';
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

  private async initializeOCR(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      console.log('Initializing Tesseract OCR engine...');
      
      // Create worker with proper configuration
      this.worker = await createWorker();
      
      // Load Dutch and English languages for better receipt recognition
      await this.worker.loadLanguage('nld+eng');
      await this.worker.initialize('nld+eng');
      
      // Configure for receipt text recognition
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz€.,:-/% ',
        tessedit_pageseg_mode: '6', // Uniform block of text
      });
      
      this.isInitialized = true;
      console.log('Tesseract OCR engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tesseract OCR engine:', error);
      throw new Error('OCR initialisatie mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    }
  }

  async extractTextFromImage(imageData: string): Promise<string> {
    try {
      await this.initializeOCR();
      
      if (!this.worker) {
        throw new Error('OCR worker niet geïnitialiseerd');
      }
      
      console.log('Starting Tesseract OCR text extraction...');
      
      // Preprocess image for better OCR results
      const processedImage = await this.preprocessImage(imageData);
      
      // Perform OCR
      const { data: { text } } = await this.worker.recognize(processedImage);
      
      console.log('OCR extraction completed');
      console.log('Extracted text:', text.substring(0, 200) + '...');
      
      return text;
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw new Error('Tekst extractie mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    }
  }

  private async preprocessImage(imageData: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Canvas context niet beschikbaar'));
              return;
            }
            
            // Set canvas size to image size
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Apply image preprocessing for better OCR
            for (let i = 0; i < data.length; i += 4) {
              // Convert to grayscale
              const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
              
              // Apply threshold for better contrast (receipt text is usually dark on light background)
              const threshold = gray > 128 ? 255 : 0;
              
              data[i] = threshold;     // Red
              data[i + 1] = threshold; // Green
              data[i + 2] = threshold; // Blue
              // Alpha channel stays the same
            }
            
            // Put processed image data back
            ctx.putImageData(imageData, 0, 0);
            
            // Return processed image as data URL
            resolve(canvas.toDataURL('image/png'));
          };
          
          img.onerror = () => reject(new Error('Kon afbeelding niet laden voor preprocessing'));
          img.src = imageData;
        });
      } else {
        // For native, return original image (preprocessing could be added later)
        return imageData;
      }
    } catch (error) {
      console.error('Image preprocessing failed, using original:', error);
      return imageData;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
      this.isInitialized = false;
      console.log('Tesseract OCR engine cleaned up');
    } catch (error) {
      console.error('Error cleaning up Tesseract OCR engine:', error);
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

// PDF text extraction using OCR
class PDFProcessor {
  private ocrEngine: LocalOCREngine;

  constructor(ocrEngine: LocalOCREngine) {
    this.ocrEngine = ocrEngine;
  }

  async extractTextFromPDF(base64PDF: string): Promise<string> {
    try {
      console.log('Processing PDF with OCR...');
      
      if (Platform.OS === 'web') {
        // For web, we can use PDF.js to convert PDF to images, then OCR
        // For now, we'll use a simplified approach
        console.log('PDF OCR processing on web - converting to image first');
        
        // In a full implementation, you would:
        // 1. Use PDF.js to render PDF pages to canvas
        // 2. Convert each canvas to image data
        // 3. Run OCR on each image
        // 4. Combine results
        
        // For now, treat PDF as image and try OCR directly
        return await this.ocrEngine.extractTextFromImage(base64PDF);
      } else {
        // For native, similar approach
        console.log('PDF OCR processing on native - converting to image first');
        return await this.ocrEngine.extractTextFromImage(base64PDF);
      }
    } catch (error) {
      console.error('PDF OCR processing failed:', error);
      throw new Error('PDF tekst extractie mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    }
  }
}

// Main local AI service
export class LocalAIService {
  private ocrEngine: LocalOCREngine;
  private pdfProcessor: PDFProcessor;

  constructor() {
    this.ocrEngine = new LocalOCREngine();
    this.pdfProcessor = new PDFProcessor(this.ocrEngine);
  }

  async processReceiptImages(imageUris: string[]): Promise<ProcessingResult> {
    try {
      console.log(`Processing ${imageUris.length} images with Tesseract OCR...`);
      
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

      const text = await this.ocrEngine.extractTextFromImage(imageData);
      const extractedData = await this.ocrEngine.processText(text);
      
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

      const text = await this.pdfProcessor.extractTextFromPDF(pdfData);
      const extractedData = await this.ocrEngine.processText(text);
      
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

  private async compressImage(imageData: string, maxSizeKB: number = 500): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Canvas context niet beschikbaar'));
              return;
            }
            
            // Calculate new dimensions to reduce file size
            let { width, height } = img;
            const maxDimension = 1200; // Max width or height
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try different quality levels until we get under the size limit
            let quality = 0.8;
            let compressedData = canvas.toDataURL('image/jpeg', quality);
            
            // Estimate size (base64 is ~33% larger than binary)
            let estimatedSizeKB = (compressedData.length * 0.75) / 1024;
            
            while (estimatedSizeKB > maxSizeKB && quality > 0.1) {
              quality -= 0.1;
              compressedData = canvas.toDataURL('image/jpeg', quality);
              estimatedSizeKB = (compressedData.length * 0.75) / 1024;
            }
            
            console.log(`Afbeelding gecomprimeerd: ${Math.round(estimatedSizeKB)}KB (kwaliteit: ${Math.round(quality * 100)}%)`);
            resolve(compressedData);
          };
          
          img.onerror = () => reject(new Error('Kon afbeelding niet laden voor compressie'));
          img.src = imageData;
        });
      } else {
        // For native, use expo-image-manipulator if available
        try {
          const ImageManipulator = await import('expo-image-manipulator');
          
          const result = await ImageManipulator.manipulateAsync(
            imageData,
            [
              { resize: { width: 1200 } }, // Resize to max 1200px width
            ],
            {
              compress: 0.7,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
          
          if (result.base64) {
            const compressedData = `data:image/jpeg;base64,${result.base64}`;
            const estimatedSizeKB = (compressedData.length * 0.75) / 1024;
            console.log(`Afbeelding gecomprimeerd (native): ${Math.round(estimatedSizeKB)}KB`);
            return compressedData;
          }
        } catch (manipulatorError) {
          console.log('ImageManipulator niet beschikbaar, gebruik originele afbeelding');
        }
        
        // Fallback: return original if compression fails
        return imageData;
      }
    } catch (error) {
      console.error('Fout bij compressie, gebruik originele afbeelding:', error);
      return imageData;
    }
  }

  private async fileToBase64(uri: string): Promise<string | null> {
    try {
      let imageData: string;
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Check file size
        const fileSizeKB = blob.size / 1024;
        console.log(`Originele bestandsgrootte: ${Math.round(fileSizeKB)}KB`);
        
        if (fileSizeKB > 2000) { // If larger than 2MB
          throw new Error('Afbeelding is te groot. Kies een kleinere afbeelding of comprimeer deze eerst.');
        }
        
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For native platforms, we need to use expo-file-system
        const FileSystem = await import('expo-file-system');
        
        // Check file size first
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists && fileInfo.size) {
          const fileSizeKB = fileInfo.size / 1024;
          console.log(`Originele bestandsgrootte: ${Math.round(fileSizeKB)}KB`);
          
          if (fileSizeKB > 2000) { // If larger than 2MB
            throw new Error('Afbeelding is te groot. Kies een kleinere afbeelding of comprimeer deze eerst.');
          }
        }
        
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const mimeType = this.getMimeType(uri);
        imageData = `data:${mimeType};base64,${base64}`;
      }
      
      // Compress if still too large for OCR processing
      const estimatedSizeKB = (imageData.length * 0.75) / 1024;
      if (estimatedSizeKB > 800) { // Compress if larger than 800KB
        console.log('Afbeelding wordt gecomprimeerd voor OCR verwerking...');
        imageData = await this.compressImage(imageData, 500); // Target 500KB
      }
      
      return imageData;
    } catch (error) {
      console.error('Error converting file to base64:', error);
      if (error instanceof Error && error.message.includes('te groot')) {
        throw error; // Re-throw size errors
      }
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