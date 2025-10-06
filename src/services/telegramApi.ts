import type { Env } from '../types/index'
import { Logger } from "../utils/logger";

const log = new Logger('TelegramApi');

/**
 * Sends a media group of image URLs to a specific Telegram chat.
 * @param chatId - The user's chat ID.
 * @param photoUrls - An array of image URLs to send.
 * @param caption - The caption for the media group.
 * @param env - The environment object.
 */
export async function sendMediaGroupToUser(
  chatId: number,
  photoUrls: string[],
  caption: string,
  env: Env
): Promise<void> {
  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMediaGroup`;
  
  const media = photoUrls.map((url, index) => ({
    type: 'photo',
    media: url,
    caption: index === 0? caption : undefined,
    parse_mode: index === 0? 'HTML' : undefined
  }));

  const body = {
    chat_id: chatId,
    media: media
  }

  const contorller = new AbortController();
  const timeoutId = setTimeout(() => contorller.abort(), 15000);

  try {
    log.info(`Sending media group (${photoUrls.length}) to user ID: ${chatId}`);

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: contorller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json() as { description: string };
      throw new Error(`error while sending media group: ${errorData.description}`);
    }

    log.info(`[SUCCESS] media group sent to ${chatId}`);
  } catch (error) {
    clearTimeout(timeoutId);
    log.error(`[FAILED] media group could not be sent to ${chatId}`, error);
    throw error;
  }
}


/**
 * Sends a simple text message to a specific Telegram chat.
 * @param chatId - The user's chat ID.
 * @param text - The text message to send.
 * @param env - The environment object.
 */
export async function sendMessage(chatId: number, text: string, env: Env): Promise<void> {
  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML', // We can still use this for formatting
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    log.info(`Sending text message to chat_id: ${chatId}`);

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json() as { description: string; };
      throw new Error(`Telegram API error: ${response.status} - ${errorData.description}`);
    }

    log.info(`Successfully sent text to chat_id: ${chatId}`);

  } catch (error) {
    clearTimeout(timeoutId);
    log.error(`Failed to send text to chat_id: ${chatId}`, error);
    throw error;
  }
}