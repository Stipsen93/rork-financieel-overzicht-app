type ContentPart =
  | { type: 'text'; text: string; }
  | { type: 'image'; image: string; };

type CoreMessage =
  | { role: 'system'; content: string; }
  | { role: 'user'; content: string | Array<ContentPart>; }
  | { role: 'assistant'; content: string | Array<ContentPart>; };

interface APIResponse {
  completion: string;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const callChatGPTAPI = async (
  messages: CoreMessage[],
  apiKey: string,
  maxRetries: number = 3
): Promise<APIResponse> => {
  // Rate limiting: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`ChatGPT API attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('ChatGPT API success');
        return { completion: data.choices[0].message.content };
      }

      // Handle specific error codes
      if (response.status === 429) {
        const errorText = await response.text();
        console.error(`ChatGPT API 429 Error (attempt ${attempt}):`, errorText);
        
        // Parse retry-after header if available
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        if (attempt < maxRetries) {
          console.log(`Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
          continue;
        } else {
          throw new Error('Je hebt te veel verzoeken gedaan naar ChatGPT. Wacht een paar minuten en probeer het opnieuw. Als je een gratis OpenAI account hebt, overweeg dan een upgrade naar een betaald plan voor hogere limieten.');
        }
      }

      if (response.status === 401) {
        throw new Error('Ongeldige API sleutel. Controleer je ChatGPT API sleutel in de instellingen.');
      }

      if (response.status === 403) {
        throw new Error('Toegang geweigerd. Controleer of je API sleutel de juiste rechten heeft.');
      }

      if (response.status >= 500) {
        const errorText = await response.text();
        console.error(`ChatGPT API Server Error (attempt ${attempt}):`, response.status, errorText);
        
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Server error, waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
          continue;
        } else {
          throw new Error('ChatGPT server is tijdelijk niet beschikbaar. Probeer het later opnieuw.');
        }
      }

      // Other client errors
      const errorText = await response.text();
      console.error('ChatGPT API Error:', response.status, errorText);
      throw new Error(`ChatGPT API fout: ${response.status}. Controleer je API sleutel en internetverbinding.`);

    } catch (error) {
      console.error(`ChatGPT API attempt ${attempt} failed:`, error);
      lastError = error as Error;
      
      // If it's a network error and we have retries left, try again
      if (attempt < maxRetries && (error as Error).message.includes('fetch')) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Network error, waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
        continue;
      }
      
      // If it's our custom error message, don't retry
      if ((error as Error).message.includes('te veel verzoeken') || 
          (error as Error).message.includes('Ongeldige API sleutel') ||
          (error as Error).message.includes('Toegang geweigerd')) {
        throw error;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('ChatGPT API verzoek mislukt na meerdere pogingen. Controleer je internetverbinding en probeer het later opnieuw.');
};