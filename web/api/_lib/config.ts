// Serverless-compatible config (uses Vercel environment variables)
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  grok: {
    apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY || '',
    baseUrl: 'https://api.x.ai/v1',
  },
};
