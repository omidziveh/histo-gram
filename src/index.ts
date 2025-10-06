import { handleWebhook } from './handlers/webhook';
import { handleScheduled } from './handlers/scheduled';
import { Logger } from './utils/logger';
import type { Env } from './types';

const log = new Logger('Index');

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === '/scheduled') {
        log.info('Received scheduled trigger.');
        await handleScheduled(env);
        return new Response('Scheduled task executed.');
      }

      if (request.method === 'POST') {
        log.info('Received webhook POST request.');
        await handleWebhook(request, env, ctx);
        return new Response('OK');
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      log.error('A critical, unhandled error occurred at the top level:', error);
      
      return new Response('Internal Server Error', { status: 500 });
    } finally {
    }
  },
};