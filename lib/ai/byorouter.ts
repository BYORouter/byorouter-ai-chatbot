import { createBYORouter } from '@byorouter/ai-sdk';

export function getByorouterProvider(connectionId: string) {
  return createBYORouter({
    apiKey: process.env.BYOROUTER_API_KEY!,
    connectionId,
  });
}
