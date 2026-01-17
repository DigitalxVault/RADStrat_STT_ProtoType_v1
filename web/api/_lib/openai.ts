import OpenAI from 'openai';
import { config } from './config';
import type { STTModel, ScoringModel } from './types';

let openaiClient: OpenAI | null = null;

const MIME_TO_EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/mp4': 'mp4',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
};

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openaiClient;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  model: STTModel,
  mimeType: string = 'audio/webm'
): Promise<{ text: string; duration: number }> {
  const client = getOpenAIClient();

  const extension = MIME_TO_EXTENSION[mimeType] || 'webm';
  const filename = `audio.${extension}`;

  const file = new File([audioBuffer], filename, { type: mimeType });

  const modelMap: Record<STTModel, string> = {
    'whisper': 'whisper-1',
    'gpt-4o-transcribe': 'gpt-4o-transcribe',
    'gpt-4o-mini-transcribe': 'gpt-4o-mini-transcribe',
  };

  const response = await client.audio.transcriptions.create({
    file,
    model: modelMap[model],
    response_format: 'verbose_json',
    language: 'en',
  });

  return {
    text: response.text,
    duration: response.duration || 0,
  };
}

export async function getLLMFeedback(
  prompt: string,
  model: ScoringModel
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  if (model === 'grok-4.1-fast') {
    throw new Error('Use Grok client for grok models');
  }

  const client = getOpenAIClient();

  const modelMap: Record<string, string> = {
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  };

  const completion = await client.chat.completions.create({
    model: modelMap[model],
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
  });

  return {
    response: completion.choices[0]?.message?.content || '',
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
  };
}

export async function getLLMScoring(
  systemPrompt: string,
  userPrompt: string,
  model: ScoringModel
): Promise<{ response: string; tokensUsed: { input: number; output: number } }> {
  if (model === 'grok-4.1-fast') {
    throw new Error('Use Grok client for grok models');
  }

  const client = getOpenAIClient();

  const modelMap: Record<string, string> = {
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  };

  const completion = await client.chat.completions.create({
    model: modelMap[model],
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
    response_format: { type: 'json_object' },
  });

  return {
    response: completion.choices[0]?.message?.content || '',
    tokensUsed: {
      input: completion.usage?.prompt_tokens || 0,
      output: completion.usage?.completion_tokens || 0,
    },
  };
}
