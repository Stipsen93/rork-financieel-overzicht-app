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

export const callGeminiAPI = async (
  messages: CoreMessage[]
): Promise<APIResponse> => {
  const endpoint = 'https://toolkit.rork.com/text/llm/';
    
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
    throw new Error(`API fout: ${response.status}. Controleer je ChatGPT API sleutel.`);
  }
  
  return await response.json();
};