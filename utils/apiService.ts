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

export const callAIAPI = async (
  messages: CoreMessage[],
  provider: 'chatgpt' | 'gemini'
): Promise<APIResponse> => {
  const endpoint = provider === 'chatgpt' 
    ? 'https://toolkit.rork.com/text/llm/'
    : 'https://toolkit.rork.com/text/gemini/';
    
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(`API fout: ${response.status}. Controleer je API sleutel.`);
  }
  
  return await response.json();
};