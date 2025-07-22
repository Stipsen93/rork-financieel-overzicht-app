import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { callChatGPTAPI, callGitHubChatGPTAPI } from './apiService';
import { localAI } from './localAIService';

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

// Lokale AI functie - gebruikt ingebouwde patroonherkenning
export const processReceiptImagesLocal = async (
  imageUris: string[]
): Promise<ReceiptData | null> => {
  try {
    if (imageUris.length === 0) {
      throw new Error('Geen afbeeldingen om te verwerken');
    }

    console.log(`Processing ${imageUris.length} images with local AI...`);
    
    const result = await localAI.processReceiptImages(imageUris);
    
    if (result.success && result.data) {
      console.log('Local AI processing successful:', result.data);
      return result.data;
    } else {
      console.log('Local AI processing failed:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('Error in local AI processing:', error);
    return null;
  }
};



export const processReceiptImages = async (
  imageUris: string[],
  apiKey?: string,
  useLocalAI: boolean = false,
  useGithubAPI: boolean = false
): Promise<ReceiptData | null> => {
  try {
    if (imageUris.length === 0) {
      throw new Error('Geen afbeeldingen om te verwerken');
    }

    // Try local AI first if requested or if no API key
    if (useLocalAI || !apiKey) {
      console.log('Trying local AI processing first...');
      const localResult = await processReceiptImagesLocal(imageUris);
      if (localResult) {
        return localResult;
      }
      console.log('Local AI failed, falling back to ChatGPT API...');
    }

    // Fallback to API if available
    if (!apiKey) {
      throw new Error('Geen API sleutel beschikbaar en lokale AI kon de afbeeldingen niet verwerken');
    }

    const apiType = useGithubAPI ? 'GitHub API' : 'OpenAI API';
    console.log(`Processing ${imageUris.length} receipt images with ${apiType}...`);

    // For GitHub API, limit to single image and compress to avoid token limit
    const imagesToProcess = useGithubAPI ? imageUris.slice(0, 1) : imageUris;
    
    if (useGithubAPI && imageUris.length > 1) {
      console.log('GitHub API: Processing only the first image due to token limits');
    }

    // Convert images to base64 with compression for GitHub API
    const base64Images = await Promise.all(
      imagesToProcess.map(async (uri, index) => {
        console.log(`Converting image ${index + 1}/${imagesToProcess.length} to base64...`);
        const base64 = await fileToBase64(uri, useGithubAPI);
        if (!base64) {
          throw new Error(`Kon afbeelding ${index + 1} niet converteren: ${uri}`);
        }
        return base64;
      })
    );
    
    // Estimate token usage for GitHub API
    if (useGithubAPI) {
      const estimatedTokens = estimateTokenUsage(base64Images);
      console.log(`Estimated tokens: ${estimatedTokens}`);
      
      if (estimatedTokens > 7000) { // Leave some buffer
        throw new Error('Afbeelding is te groot voor GitHub API. Probeer een kleinere afbeelding of gebruik de OpenAI API.');
      }
    }
    
    const contentParts: ContentPart[] = [
      { type: 'text', text: `Analyseer ${imagesToProcess.length > 1 ? 'deze bonnen/facturen' : 'deze bon/factuur'} en extraheer de volgende informatie:` }
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
        content: `Je bent een expert in het lezen van bonnen en facturen. Analyseer ${imagesToProcess.length > 1 ? 'alle afbeeldingen' : 'de afbeelding'} en extraheer de belangrijkste informatie.

${imagesToProcess.length > 1 ? 
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
    
    console.log(`Sending request to ${apiType}...`);
    const data = useGithubAPI 
      ? await callGitHubChatGPTAPI(messages, apiKey)
      : await callChatGPTAPI(messages, apiKey);
    console.log(`Received response from ${apiType}`);
    
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
    
    // Handle specific GitHub API token limit error
    if ((error as Error).message.includes('Request body too large') || 
        (error as Error).message.includes('Max size: 8000 tokens')) {
      throw new Error('Afbeelding is te groot voor GitHub API. Probeer een kleinere afbeelding of gebruik de OpenAI API in de instellingen.');
    }
    
    // Re-throw with user-friendly message if it's our custom error
    if ((error as Error).message.includes('te veel verzoeken') || 
        (error as Error).message.includes('API sleutel') ||
        (error as Error).message.includes('Toegang geweigerd') ||
        (error as Error).message.includes('server is tijdelijk') ||
        (error as Error).message.includes('te groot voor GitHub API')) {
      throw error;
    }
    
    // Generic error for other cases
    throw new Error('Kon bonnen niet verwerken. Controleer je internetverbinding en probeer het opnieuw. Als het probleem aanhoudt, wacht dan een paar minuten voordat je het opnieuw probeert.');
  }
};

// Keep the original function for backward compatibility
export const processReceiptImage = async (
  imageUri: string,
  apiKey?: string,
  useLocalAI: boolean = false
): Promise<ReceiptData | null> => {
  return processReceiptImages([imageUri], apiKey, useLocalAI);
};

// New function to process PDFs
export const processPDF = async (
  pdfUri: string,
  apiKey?: string,
  useLocalAI: boolean = true
): Promise<ReceiptData | null> => {
  try {
    console.log('Processing PDF...');
    
    // Try local AI first for PDFs
    if (useLocalAI) {
      const result = await localAI.processPDF(pdfUri);
      if (result.success && result.data) {
        return result.data;
      }
      console.log('Local PDF processing failed:', result.error);
    }
    
    // For now, PDFs are only supported locally
    // In the future, you could add ChatGPT API support for PDFs
    throw new Error('PDF verwerking is momenteel alleen lokaal beschikbaar');
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
};

// Estimate token usage for base64 images (rough approximation)
const estimateTokenUsage = (base64Images: string[]): number => {
  let totalTokens = 500; // Base tokens for system message and text
  
  base64Images.forEach(base64 => {
    // Remove data URL prefix to get actual base64 length
    const base64Data = base64.split(',')[1] || base64;
    // Rough approximation: 1 token per 4 characters of base64
    const imageTokens = Math.ceil(base64Data.length / 4);
    totalTokens += imageTokens;
  });
  
  return totalTokens;
};

// Compress image for GitHub API to reduce token usage
const compressImageForGitHubAPI = async (base64: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Reduce image size for GitHub API
          const maxWidth = 800;
          const maxHeight = 800;
          
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress with lower quality for GitHub API
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedBase64);
        };
        img.src = base64;
      });
    } else {
      // For native, return as-is for now (could implement native compression)
      return base64;
    }
  } catch (error) {
    console.error('Error compressing image:', error);
    return base64; // Return original if compression fails
  }
};

const fileToBase64 = async (uri: string, compressForGitHub: boolean = false): Promise<string | null> => {
  try {
    let base64: string;
    
    if (Platform.OS === 'web') {
      base64 = await fetchImageAsBase64(uri);
    } else {
      const fileBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine MIME type based on file extension
      const mimeType = getMimeType(uri);
      base64 = `data:${mimeType};base64,${fileBase64}`;
    }
    
    // Compress for GitHub API if requested
    if (compressForGitHub) {
      base64 = await compressImageForGitHubAPI(base64);
    }
    
    return base64;
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