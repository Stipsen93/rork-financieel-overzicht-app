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

export const callChatGPTAPI = async (
  messages: CoreMessage[],
  apiKey: string
): Promise<APIResponse> => {
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
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('ChatGPT API Error:', response.status, errorText);
    throw new Error(`ChatGPT API fout: ${response.status}. Controleer je API sleutel.`);
  }
  
  const data = await response.json();
  return { completion: data.choices[0].message.content };
};