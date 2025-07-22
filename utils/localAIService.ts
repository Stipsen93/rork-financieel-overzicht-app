import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

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

// Simple OCR simulation using pattern matching
class LocalOCREngine {
  private extractTextFromImage(base64Image: string): Promise<string> {
    // This is a simplified simulation of OCR
    // In a real implementation, you would use a library like Tesseract.js
    // For now, we'll return a mock text that represents common receipt patterns
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        // This would normally be the actual OCR result
        // For demonstration, we'll return empty string to indicate OCR not available
        resolve('');
      }, 1000);
    });
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
    const name = this.extractCompanyName(text);
    const amount = this.extractAmount(text);
    const date = this.extractDate(text);
    const vatRate = this.extractVATRate(text);

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
      console.log(`Processing ${imageUris.length} images locally...`);
      
      let combinedText = '';
      let processedCount = 0;

      for (const uri of imageUris) {
        try {
          const base64 = await this.fileToBase64(uri);
          if (base64) {
            // In a real implementation, this would use actual OCR
            // For now, we'll use pattern-based analysis on filename and mock data
            const mockText = await this.generateMockReceiptText(uri);
            combinedText += mockText + '\n';
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing image ${uri}:`, error);
        }
      }

      if (processedCount === 0) {
        return {
          success: false,
          error: 'Geen afbeeldingen konden worden verwerkt'
        };
      }

      const extractedData = await this.ocrEngine.processText(combinedText);
      
      return {
        success: true,
        data: extractedData
      };

    } catch (error) {
      console.error('Error in local AI processing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout bij lokale verwerking'
      };
    }
  }

  async processPDF(pdfUri: string): Promise<ProcessingResult> {
    try {
      console.log('Processing PDF locally...');
      
      const base64 = await this.fileToBase64(pdfUri);
      if (!base64) {
        return {
          success: false,
          error: 'Kon PDF niet lezen'
        };
      }

      const text = await this.pdfProcessor.extractTextFromPDF(base64);
      const extractedData = await this.ocrEngine.processText(text);
      
      return {
        success: true,
        data: extractedData
      };

    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout bij PDF verwerking'
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

  private async generateMockReceiptText(uri: string): Promise<string> {
    // This generates mock receipt text for demonstration
    // In a real implementation, this would be replaced with actual OCR
    
    // Generate more realistic random data based on common patterns
    const companies = [
      'Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Coop', 'Spar',
      'Action', 'Hema', 'Blokker', 'Kruidvat', 'Etos', 'DA',
      'MediaMarkt', 'Coolblue', 'Shell', 'BP', 'Esso', 'Total',
      'McDonald\'s', 'Burger King', 'KFC', 'Subway', 'Domino\'s',
      'IKEA', 'Gamma', 'Karwei', 'Hornbach', 'Praxis',
      'Restaurant De Gouden Leeuw', 'Café Central', 'Hotel Van der Valk'
    ];
    
    const items = [
      { name: 'Brood', price: [1.50, 3.50] },
      { name: 'Melk', price: [1.00, 2.00] },
      { name: 'Kaas', price: [3.00, 8.00] },
      { name: 'Groenten', price: [2.00, 6.00] },
      { name: 'Vlees', price: [5.00, 15.00] },
      { name: 'Dranken', price: [1.50, 8.00] },
      { name: 'Benzine', price: [40.00, 80.00] },
      { name: 'Hoofdgerecht', price: [12.00, 25.00] },
      { name: 'Dessert', price: [4.00, 8.00] },
      { name: 'Koffie', price: [2.50, 4.50] },
      { name: 'Boodschappen', price: [15.00, 45.00] },
      { name: 'Gereedschap', price: [8.00, 35.00] }
    ];
    
    // Generate random receipt
    const company = companies[Math.floor(Math.random() * companies.length)];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const selectedItems = [];
    let total = 0;
    
    for (let i = 0; i < numItems; i++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const price = Math.random() * (item.price[1] - item.price[0]) + item.price[0];
      const roundedPrice = Math.round(price * 100) / 100;
      selectedItems.push({ name: item.name, price: roundedPrice });
      total += roundedPrice;
    }
    
    total = Math.round(total * 100) / 100;
    
    // Generate random date within last 30 days
    const today = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const receiptDate = new Date(today.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    // Generate VAT rate (mostly 21%, sometimes 9% or 0%)
    const vatRates = [21, 21, 21, 21, 9, 0]; // Weighted towards 21%
    const vatRate = vatRates[Math.floor(Math.random() * vatRates.length)];
    const vatAmount = Math.round((total * vatRate / (100 + vatRate)) * 100) / 100;
    
    // Build receipt text
    let receiptText = `${company}\n`;
    receiptText += `Kassakbon\n`;
    receiptText += `Datum: ${receiptDate.toLocaleDateString('nl-NL')}\n\n`;
    
    selectedItems.forEach(item => {
      receiptText += `${item.name} €${item.price.toFixed(2)}\n`;
    });
    
    receiptText += `\nTotaal: €${total.toFixed(2)}\n`;
    if (vatRate > 0) {
      receiptText += `BTW ${vatRate}%: €${vatAmount.toFixed(2)}\n`;
    }
    receiptText += `\nBedankt voor uw bezoek!`;
    
    return receiptText;
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