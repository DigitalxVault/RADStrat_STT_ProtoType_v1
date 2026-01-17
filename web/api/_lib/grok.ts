import { config } from './config';

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export async function getGrokFeedback(
  prompt: string
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  const response = await fetch(`${config.grok.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.grok.apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3-fast-latest',
      messages: [
        {
          role: 'system',
          content: 'You are an expert RT (Radio Telephony) communication evaluator. Provide concise, constructive feedback in plain text. Do not use JSON formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as GrokResponse;

  return {
    response: data.choices[0]?.message?.content || '',
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
  };
}

export async function getGrokScoring(
  systemPrompt: string,
  userPrompt: string
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  const response = await fetch(`${config.grok.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.grok.apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3-fast-latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      stream: false,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as GrokResponse;

  return {
    response: data.choices[0]?.message?.content || '',
    tokensUsed: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
  };
}
