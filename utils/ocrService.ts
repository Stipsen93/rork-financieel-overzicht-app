import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { callChatGPTAPI } from './apiService';
import Tesseract from 'tesseract.js';

interface ReceiptData {
  name?: string;
  amount?: number;
  vatRate?: number;
  date?: string;
}

type ContentPart =
  | { type: 'text'; text: string; }
  | { type: 'image'; image: string; };

type CoreMessage =
  | { role: 'system'; content: string; }
  | { role: 'user'; content: string | Array<ContentPart>; }
  | { role: 'assistant'; content: string | Array<ContentPart>; };

// Lokale OCR functie zonder externe API
export const processReceiptImagesLocal = async (
  imageUris: string[]
): Promise<ReceiptData | null> => {
  try {
    if (imageUris.length === 0) {
      throw new Error('Geen afbeeldingen om te verwerken');
    }

    console.log(`Processing ${imageUris.length} receipt images locally...`);

    // Extract text from all images using Tesseract
    const extractedTexts = await Promise.all(
      imageUris.map(async (uri, index) => {
        console.log(`Extracting text from image ${index + 1}/${imageUris.length}...`);
        
        try {
          const { data: { text } } = await Tesseract.recognize(
            uri,
            'nld+eng', // Dutch and English
            {
              logger: m => console.log(`OCR Progress: ${m.status} ${m.progress}%`)
            }
          );
          
          console.log(`Extracted text from image ${index + 1}:`, text.substring(0, 200) + '...');
          return text;
        } catch (ocrError) {
          console.error(`OCR failed for image ${index + 1}:`, ocrError);
          return '';
        }
      })
    );

    // Combine all extracted text
    const combinedText = extractedTexts.join('\n\n--- VOLGENDE BON ---\n\n');
    
    if (!combinedText.trim()) {
      throw new Error('Geen tekst gevonden in de afbeeldingen. Zorg voor duidelijke, goed verlichte foto\'s.');
    }

    console.log('Combined extracted text:', combinedText.substring(0, 500) + '...');

    // Parse the extracted text locally
    const receiptData = parseReceiptText(combinedText);
    
    if (!receiptData.name && !receiptData.amount) {
      throw new Error('Kon geen bruikbare informatie vinden in de bon. Probeer een duidelijkere foto.');
    }

    console.log('Successfully parsed receipt data locally:', receiptData);
    return receiptData;
    
  } catch (error) {
    console.error('Error processing receipt images locally:', error);
    throw error;
  }
};

// Lokale tekst parsing functie
const parseReceiptText = (text: string): ReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let name = '';
  let amount = 0;
  let vatRate = 21; // Default BTW tarief
  let date = '';

  // Zoek naar bedrijfsnaam (meestal bovenaan)
  const businessNamePatterns = [
    /^[A-Z][A-Za-z\s&.,-]{3,30}$/,
    /^[A-Z][A-Za-z\s]{2,}\s+(B\.?V\.?|N\.?V\.?|VOF|BV|NV)$/i,
    /^[A-Z][A-Za-z\s]+\s+(Supermarkt|Restaurant|Café|Store|Shop)$/i
  ];
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (businessNamePatterns.some(pattern => pattern.test(line))) {
      name = line;
      break;
    }
  }

  // Als geen bedrijfsnaam gevonden, neem de eerste niet-lege regel
  if (!name && lines.length > 0) {
    name = lines[0].replace(/[^A-Za-z\s&.,-]/g, '').trim();
  }

  // Zoek naar totaalbedrag
  const amountPatterns = [
    /(?:totaal|total|subtotal|bedrag|te\s+betalen|amount)\s*:?\s*€?\s*([0-9]+[.,][0-9]{2})/i,
    /€\s*([0-9]+[.,][0-9]{2})\s*(?:totaal|total|bedrag)?/i,
    /([0-9]+[.,][0-9]{2})\s*€/,
    /([0-9]+[.,][0-9]{2})/
  ];

  const amounts: number[] = [];
  
  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amountStr = match[1].replace(',', '.');
        const parsedAmount = parseFloat(amountStr);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amounts.push(parsedAmount);
        }
      }
    }
  }

  // Neem het hoogste bedrag als totaal
  if (amounts.length > 0) {
    amount = Math.max(...amounts);
  }

  // Zoek naar datum
  const datePatterns = [
    /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/,
    /([0-9]{1,2}\s+[a-zA-Z]{3,}\s+[0-9]{2,4})/,
    /([0-9]{2,4}[-\/][0-9]{1,2}[-\/][0-9]{1,2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = formatDate(match[1]);
        if (date) break;
      }
    }
    if (date) break;
  }

  // Als geen datum gevonden, gebruik vandaag
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  // Bepaal BTW tarief op basis van tekst
  const lowVatKeywords = ['boek', 'medicijn', 'voedsel', 'groente', 'fruit', 'brood'];
  const textLower = text.toLowerCase();
  
  if (lowVatKeywords.some(keyword => textLower.includes(keyword))) {
    vatRate = 9;
  } else if (textLower.includes('btw') || textLower.includes('vat')) {
    // Probeer BTW percentage te vinden
    const vatMatch = text.match(/([0-9]+)%?\s*(?:btw|vat)/i);
    if (vatMatch) {
      const parsedVat = parseInt(vatMatch[1]);
      if ([0, 9, 21].includes(parsedVat)) {
        vatRate = parsedVat;
      }
    }
  }

  return {
    name: name || 'Onbekende leverancier',
    amount,
    vatRate,
    date
  };
};

// Hulpfunctie voor datum formatting
const formatDate = (dateStr: string): string => {
  try {
    // Probeer verschillende datum formaten
    const formats = [
      /^([0-9]{1,2})[-\/]([0-9]{1,2})[-\/]([0-9]{2,4})$/, // DD/MM/YYYY of DD-MM-YYYY
      /^([0-9]{2,4})[-\/]([0-9]{1,2})[-\/]([0-9]{1,2})$/, // YYYY/MM/DD of YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let day, month, year;
        
        if (match[3].length === 4) {
          // DD/MM/YYYY format
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        } else {
          // YYYY/MM/DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        }

        // Valideer datum
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
          const date = new Date(year, month - 1, day);
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    return '';
  } catch {
    return '';
  }
};

export const processReceiptImages = async (
  imageUris: string[],
  apiKey: string
): Promise<ReceiptData | null> => {
  try {
    if (imageUris.length === 0) {
      throw new Error('Geen afbeeldingen om te verwerken');
    }

    console.log(`Processing ${imageUris.length} receipt images...`);

    // Convert all images to base64
    const base64Images = await Promise.all(
      imageUris.map(async (uri, index) => {
        console.log(`Converting image ${index + 1}/${imageUris.length} to base64...`);
        const base64 = await fileToBase64(uri);
        if (!base64) {
          throw new Error(`Kon afbeelding ${index + 1} niet converteren: ${uri}`);
        }
        return base64;
      })
    );
    
    const contentParts: ContentPart[] = [
      { type: 'text', text: `Analyseer ${imageUris.length > 1 ? 'deze bonnen/facturen' : 'deze bon/factuur'} en extraheer de volgende informatie:` }
    ];

    // Add all images to the content
    base64Images.forEach((base64, index) => {
      contentParts.push({
        type: 'text',
        text: `Afbeelding ${index + 1}:`
      });
      contentParts.push({
        type: 'image',
        image: base64
      });
    });

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `Je bent een expert in het lezen van bonnen en facturen. Analyseer ${imageUris.length > 1 ? 'alle afbeeldingen' : 'de afbeelding'} en extraheer de belangrijkste informatie.

${imageUris.length > 1 ? 
  'Als er meerdere bonnen zijn, combineer de bedragen tot één totaal. Gebruik de naam van de belangrijkste/grootste uitgave.' : 
  'Extraheer de informatie van deze ene bon.'
}

Extraheer:
1. Bedrijfsnaam/leverancier
2. Totaal bedrag (combineer alle bedragen als er meerdere bonnen zijn)
3. BTW tarief (schat in op basis van het type aankoop)
4. Datum (gebruik de meest recente datum als er meerdere zijn)

Retourneer je antwoord als een JSON object:
{
  "name": "Bedrijfsnaam",
  "amount": 123.45,
  "vatRate": 21,
  "date": "YYYY-MM-DD"
}

Retourneer alleen het JSON object, geen andere tekst.`,
      },
      {
        role: 'user',
        content: contentParts,
      },
    ];
    
    console.log('Sending request to ChatGPT API...');
    const data = await callChatGPTAPI(messages, apiKey);
    console.log('Received response from ChatGPT API');
    
    if (data.completion) {
      try {
        // Try to parse the JSON response
        const jsonStart = data.completion.indexOf('{');
        const jsonEnd = data.completion.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = data.completion.substring(jsonStart, jsonEnd);
          const result = JSON.parse(jsonStr);
          console.log('Successfully parsed receipt data:', result);
          return result;
        }
      } catch (parseError) {
        console.error('Error parsing JSON from AI response:', parseError);
        throw new Error('Kon de bon informatie niet verwerken. Probeer het opnieuw met een duidelijkere foto.');
      }
    }
    
    throw new Error('Geen bruikbare informatie gevonden in de bon. Controleer of de foto duidelijk leesbaar is.');
  } catch (error) {
    console.error('Error processing receipt images:', error);
    
    // Re-throw with user-friendly message if it's our custom error
    if ((error as Error).message.includes('te veel verzoeken') || 
        (error as Error).message.includes('API sleutel') ||
        (error as Error).message.includes('Toegang geweigerd') ||
        (error as Error).message.includes('server is tijdelijk')) {
      throw error;
    }
    
    // Generic error for other cases
    throw new Error('Kon bonnen niet verwerken. Controleer je internetverbinding en probeer het opnieuw. Als het probleem aanhoudt, wacht dan een paar minuten voordat je het opnieuw probeert.');
  }
};

// Keep the original function for backward compatibility
export const processReceiptImage = async (
  imageUri: string,
  apiKey: string
): Promise<ReceiptData | null> => {
  return processReceiptImages([imageUri], apiKey);
};

const fileToBase64 = async (uri: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await fetchImageAsBase64(uri);
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine MIME type based on file extension
      const mimeType = getMimeType(uri);
      return `data:${mimeType};base64,${base64}`;
    }
  } catch (error) {
    console.error('Error converting file to base64:', error);
    return null;
  }
};

const fetchImageAsBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getMimeType = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
};