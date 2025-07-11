import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface ReceiptData {
  name?: string;
  amount?: number;
  vatRate?: number;
  date?: string;
}

export const processReceiptImage = async (
  imageUri: string,
  apiKey: string
): Promise<ReceiptData | null> => {
  try {
    // Convert image to base64
    const base64 = await fileToBase64(imageUri);
    
    if (!base64) {
      throw new Error('Failed to convert image to base64');
    }
    
    const messages = [
      {
        role: 'system',
        content: `You are a receipt analyzer. Extract the following information from the receipt image:
          1. Merchant/Company name
          2. Total amount
          3. VAT rate (if available, default to 21%)
          4. Date of purchase
          
          Format your response as a JSON object with the following keys:
          {
            "name": "Merchant name",
            "amount": 123.45,
            "vatRate": 21,
            "date": "YYYY-MM-DD"
          }
          
          Only return the JSON object, nothing else.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Please analyze this receipt:' },
          { type: 'image', image: base64 },
        ],
      },
    ];
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
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
    console.error('Error processing receipt:', error);
    throw error;
  }
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