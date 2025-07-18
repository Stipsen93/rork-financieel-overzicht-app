import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  vatRate?: number;
}

export const processBankStatement = async (
  fileUri: string,
  fileType: 'image' | 'pdf',
  apiKey: string
): Promise<BankTransaction[] | null> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(fileUri, fileType);
    
    if (!base64) {
      throw new Error('Failed to convert file to base64');
    }
    
    const messages = [
      {
        role: 'system',
        content: `Je bent een expert in het lezen van bankafschriften. Analyseer het bankafschrift en extraheer alle transacties.

Voor elke transactie heb ik nodig:
1. Datum (YYYY-MM-DD formaat)
2. Beschrijving/naam van de transactie
3. Bedrag (positief voor inkomsten, negatief voor uitgaven)
4. BTW tarief (schat in op basis van het type transactie: 21% voor meeste diensten, 9% voor voedsel/boeken, 0% voor bankkosten/rente)

Retourneer je antwoord als een JSON array met deze structuur:
[
  {
    "date": "2024-01-15",
    "description": "Klant betaling",
    "amount": 1250.00,
    "vatRate": 21
  },
  {
    "date": "2024-01-16", 
    "description": "Tankstation Shell",
    "amount": -85.50,
    "vatRate": 21
  }
]

Negeer saldo's en totalen, focus alleen op individuele transacties.
Retourneer alleen het JSON array, geen andere tekst.`,
      },
      {
        role: 'user',
        content: fileType === 'image' ? [
          { type: 'text', text: 'Analyseer dit bankafschrift en extraheer alle transacties:' },
          { type: 'image', image: base64 },
        ] : [
          { type: 'text', text: 'Analyseer dit PDF bankafschrift en extraheer alle transacties. Het bestand is in base64 formaat.' },
          { type: 'text', text: base64 },
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
        const jsonStart = data.completion.indexOf('[');
        const jsonEnd = data.completion.lastIndexOf(']') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = data.completion.substring(jsonStart, jsonEnd);
          const transactions = JSON.parse(jsonStr);
          
          // Validate and clean the transactions
          return transactions.filter((transaction: any) => 
            transaction.date && 
            transaction.description && 
            typeof transaction.amount === 'number'
          ).map((transaction: any) => ({
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            vatRate: transaction.vatRate || 21,
          }));
        }
      } catch (parseError) {
        console.error('Error parsing JSON from AI response:', parseError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing bank statement:', error);
    throw error;
  }
};

const fileToBase64 = async (uri: string, fileType: 'image' | 'pdf'): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await fetchFileAsBase64(uri);
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine MIME type
      const mimeType = fileType === 'pdf' ? 'application/pdf' : getMimeType(uri);
      return `data:${mimeType};base64,${base64}`;
    }
  } catch (error) {
    console.error('Error converting file to base64:', error);
    return null;
  }
};

const fetchFileAsBase64 = async (uri: string): Promise<string> => {
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
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
};