import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { callGeminiAPI } from './apiService';

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  vatRate?: number;
}

interface SelectedFile {
  uri: string;
  type: 'image' | 'pdf';
  name?: string;
}

type ContentPart =
  | { type: 'text'; text: string; }
  | { type: 'image'; image: string; };

type CoreMessage =
  | { role: 'system'; content: string; }
  | { role: 'user'; content: string | Array<ContentPart>; }
  | { role: 'assistant'; content: string | Array<ContentPart>; };

export const processBankStatements = async (
  files: SelectedFile[],
  apiKey: string
): Promise<BankTransaction[] | null> => {
  try {
    if (files.length === 0) {
      throw new Error('Geen bestanden om te verwerken');
    }

    // Separate images and PDFs
    const imageFiles = files.filter(f => f.type === 'image');
    const pdfFiles = files.filter(f => f.type === 'pdf');

    // Convert image files to base64
    const base64Images = await Promise.all(
      imageFiles.map(async (file) => {
        const base64 = await fileToBase64(file.uri);
        if (!base64) {
          throw new Error(`Kon afbeelding niet converteren: ${file.uri}`);
        }
        return { base64, name: file.name };
      })
    );

    // Convert PDF files to base64
    const base64PDFs = await Promise.all(
      pdfFiles.map(async (file) => {
        const base64 = await fileToBase64(file.uri);
        if (!base64) {
          throw new Error(`Kon PDF niet converteren: ${file.uri}`);
        }
        return { base64, name: file.name };
      })
    );
    
    const contentParts: ContentPart[] = [
      { 
        type: 'text', 
        text: `Analyseer ${files.length > 1 ? 'deze bankafschriften' : 'dit bankafschrift'} en extraheer alle transacties:

${pdfFiles.length > 0 ? `
PDF BESTANDEN (${pdfFiles.length}):
${base64PDFs.map((pdf, index) => `
PDF ${index + 1}${pdf.name ? ` (${pdf.name})` : ''}:
${pdf.base64}
`).join('')}
` : ''}

${imageFiles.length > 0 ? `AFBEELDING BESTANDEN (${imageFiles.length}):` : ''}`
      }
    ];

    // Add image files to content
    base64Images.forEach((image, index) => {
      contentParts.push({
        type: 'text',
        text: `Afbeelding ${index + 1}${image.name ? ` (${image.name})` : ''}:`
      });
      contentParts.push({
        type: 'image',
        image: image.base64
      });
    });

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `Je bent een expert in het lezen van Nederlandse bankafschriften van alle grote banken (ING, Rabobank, ABN AMRO, SNS, etc.) in zowel afbeelding als PDF formaat. 

BELANGRIJKE INSTRUCTIES:

1. NEGEER SPAARREKENING TRANSACTIES: Negeer alle transacties die gaan naar of van spaarrekeningen, beleggingsrekeningen, of andere eigen rekeningen. Dit zijn interne overboekingen en geen echte inkomsten of uitgaven.

2. VERSCHILLENDE BANKFORMATEN: Elk bankafschrift heeft een ander formaat:
   - ING: Gebruikt vaak tabellen met kolommen voor datum, beschrijving, bedrag, saldo
   - Rabobank: Heeft een andere layout met transactiedetails
   - ABN AMRO: Weer een ander formaat
   - Lees ALLE tekst in het document, ook als het in tabelvorm staat

3. PDF VERWERKING: Voor PDF bestanden:
   - De PDF inhoud is als base64 data verstrekt
   - Extraheer ALLE tekst uit het PDF bestand
   - Lees alle pagina's als er meerdere zijn
   - Zoek naar transactietabellen, lijsten, of andere formaten

4. TRANSACTIE IDENTIFICATIE:
   - Zoek naar datums (DD-MM-YYYY, DD/MM/YYYY, etc.)
   - Zoek naar bedragen (met + of - teken, of in aparte kolommen)
   - Zoek naar beschrijvingen van transacties
   - Let op verschillende valuta notaties (€, EUR)

Voorbeelden van transacties die je MOET NEGEREN:
- "Overboeking naar spaarrekening"
- "Van spaarrekening"
- "Naar beleggingsrekening"
- "Interne overboeking"
- "Transfer eigen rekening"
- Transacties tussen eigen rekeningnummers

Voor elke ECHTE transactie heb ik nodig:
1. Datum (YYYY-MM-DD formaat)
2. Beschrijving/naam van de transactie (volledige beschrijving)
3. Bedrag (positief voor inkomsten, negatief voor uitgaven)
4. BTW tarief (schat in: 21% voor meeste diensten, 9% voor voedsel/boeken, 0% voor bankkosten/rente)

${files.length > 1 ? 
  'Combineer alle transacties van alle bankafschriften (zowel PDF als afbeeldingen) in één lijst.' : 
  'Extraheer alle transacties van dit bankafschrift.'
}

Focus alleen op:
- Betalingen van klanten (inkomsten)
- Zakelijke uitgaven (brandstof, kantoorbenodigdheden, etc.)
- Bankkosten en administratiekosten
- Verzekeringen
- Andere bedrijfsgerelateerde transacties
- Pinbetalingen en online betalingen
- Automatische incasso's voor zakelijke doeleinden

Retourneer je antwoord als een JSON array met deze exacte structuur:
[
  {
    "date": "2024-01-15",
    "description": "Klant betaling factuur 2024-001",
    "amount": 1250.00,
    "vatRate": 21
  },
  {
    "date": "2024-01-16", 
    "description": "Shell tankstation Amsterdam",
    "amount": -85.50,
    "vatRate": 21
  }
]

BELANGRIJK: 
- Retourneer alleen het JSON array, geen andere tekst
- Gebruik volledige beschrijvingen zoals ze in het bankafschrift staan
- Controleer alle pagina's van PDF bestanden
- Negeer saldo's, totalen, en spaarrekening transacties
- Als je geen transacties vindt, retourneer een lege array: []`,
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
        console.log('AI Response:', data.completion);
        throw new Error('Kon transacties niet verwerken uit AI antwoord. Mogelijk is het PDF formaat niet ondersteund.');
      }
    }
    
    throw new Error('Geen transacties gevonden in de bankafschriften');
  } catch (error) {
    console.error('Error processing bank statements:', error);
    throw error;
  }
};

// Keep the original function for backward compatibility
export const processBankStatement = async (
  fileUri: string,
  fileType: 'image' | 'pdf',
  apiKey: string
): Promise<BankTransaction[] | null> => {
  return processBankStatements([{ uri: fileUri, type: fileType }], apiKey);
};

const fileToBase64 = async (uri: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await fetchFileAsBase64(uri);
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // For PDFs, return with proper data URL prefix for better AI processing
      // For images, include the data URL prefix
      const extension = uri.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        return `data:application/pdf;base64,${base64}`;
      } else {
        const mimeType = getMimeType(uri);
        return `data:${mimeType};base64,${base64}`;
      }
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
    reader.onload = () => {
      const result = reader.result as string;
      // For PDFs on web, return with data URL prefix for better AI processing
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getMimeType = (uri: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
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
      return 'application/octet-stream';
  }
};