import { handleWebhook } from './handlers/webhook';
import { handleScheduled } from './handlers/scheduled';
import { Logger } from './utils/logger';
import type { Env } from './types';

const log = new Logger('Index');

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {

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

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    log.info('🚀 CRON TRIGGER FIRED! The handleScheduled function is running.');
    await handleScheduled(env);
  }
};