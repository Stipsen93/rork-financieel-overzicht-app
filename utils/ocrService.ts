import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { callGeminiAPI } from './apiService';

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

export const processReceiptImages = async (
  imageUris: string[],
  apiKey: string
): Promise<ReceiptData | null> => {
  try {
    if (imageUris.length === 0) {
      throw new Error('Geen afbeeldingen om te verwerken');
    }

    // Convert all images to base64
    const base64Images = await Promise.all(
      imageUris.map(async (uri) => {
        const base64 = await fileToBase64(uri);
        if (!base64) {
          throw new Error(`Kon afbeelding niet converteren: ${uri}`);
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
    
    const data = await callGeminiAPI(messages);
    
    if (data.completion) {
      try {
        // Try to parse the JSON response
        const jsonStart = data.completion.indexOf('{');
        const jsonEnd = data.completion.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = data.completion.substring(jsonStart, jsonEnd);
          return JSON.parse(jsonStr);
        }
      } catch (parseError) {
        console.error('Error parsing JSON from AI response:', parseError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing receipt images:', error);
    throw error;
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