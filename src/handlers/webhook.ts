import type { TelegramUpdate, Env } from '../types';
import { handleBeta, handleListUsers, handleSkipObject, handleStart, handleStop, handleTestBroadcast, handleUpdateUsernames } from '../bot/commands';
import { isRateLimited } from '../utils/rateLimiter';
import { Logger } from "../utils/logger";
import { copyMessage, sendMessage } from '../services/telegramApi';
import { escapeMarkdown } from '../utils/caption';
import { getPreparationMessageId, handleApprovePreparation, handleRetryPreparation, handleSkipPreparation } from '../utils/preparation';
import { handlePrepareScheduled, handleScheduled } from './scheduled';

const log = new Logger('WebhookHandler');

export async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let chatId: number | undefined;

    try {
        const update: TelegramUpdate = await request.json();
        const message = update.message;
        if (!message || !message.text) {
            return new Response('OK');
        }
        const command = message.text;
        const chatId = message.chat.id;

        // if (await isRateLimited(chatId, env)) {
        //     log.warn(`Rate limit exceeded for chatId ${chatId}`);
        //     return new Response('OK');
        // }

        switch (command) {
            case '/start': {
                await handleStart(message, env);
                break;
            }
            case '/stop': {
                await handleStop(message, env);
                break;
            }
            case '/test': {
                await handleScheduled(env);
                break;
            }
            case '/listusers': {
                await handleListUsers(message, env);
                break;
            }
            case '/testbroadcast': { // Add this case
                await handleTestBroadcast(message, env, ctx);
                break;
            }
            case '/updateusernames': { // Add this case
                await handleUpdateUsernames(message, env);
                break;
            }
            case '/skip': {
                await handleSkipObject(message, env);
                break;
            }
            case '/skipprepare': {
                await handleSkipPreparation(env);
                break;
            }
            case '/retryprepare': {
                await handleRetryPreparation(env);
                break;
            }
            case '/approveprepare': {
                await handleApprovePreparation(env);
                break;
            }
            case '/prepare': {
                await handlePrepareScheduled(env, false);
                break;
            }
            case '/beta': {
                await handleBeta(message, env);
            }
            default:{
                break;
            }
        }

    } catch (error) {
        log.error('A critical error occurred in the webhook handler:', error);
        
        // IMPORTANT: Try to send an error message, but if IT fails, don't crash.
        if (chatId) {
            try {
                const errorText = escapeMarkdown('Sorry, a critical error occurred. The admin has been notified.');
                await sendMessage(chatId, errorText, env);
            } catch (sendError) {
                log.error('Failed to send error message to user:', sendError);
                // If even the error message fails, we do nothing else.
            }
        }
    } finally {
        // This block runs NO MATTER WHAT - success or failure.
        // This is the key to breaking the loop.
        return new Response('OK');
    }
}