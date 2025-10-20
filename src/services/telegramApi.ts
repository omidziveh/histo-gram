import { InputMediaPhoto } from "grammy/types";

import type { Env, TelegramMessage } from '../types/index'
import { Logger } from "../utils/logger";

const log = new Logger('TelegramApi');

// Map of callback_data => handler function. Other modules (like webhook handlers)
// can import this map to dispatch callback_query events to the registered handlers.
export const inlineKeyboardHandlers: Map<string, (...args: any[]) => Promise<void> | void> = new Map();

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
): Promise<number | void> {
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

    const rawResponseText = await response.text();
    log.info(`Raw response text: ${rawResponseText}`);

    const data = JSON.parse(rawResponseText) as { result: Array<{ message_id: number }> };
    const messageId = data.result[0].message_id;

    log.info(`Media group sent successfully to chat_id: ${chatId} with message_id: ${messageId}`);

    log.info(`[SUCCESS] media group sent to ${chatId}`);
    return messageId;

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

/**
 * Copies a message from one chat to another. This hides the "forwarded from" header.
 * @param toChatId - The target chat ID where the message will be sent.
 * @param fromChatId - The source chat ID where the message was sent.
 * @param messageId - The message ID to copy.
 * @param env - The environment object.
 */
export async function copyMessage(toChatId: number, fromChatId: number, messageId: number, env: Env): Promise<number> {
    const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/copyMessage`;
    const body = {
        chat_id: toChatId,
        from_chat_id: fromChatId,
        message_id: messageId,
    };


    const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (response.status === 403) {
        // User has blocked the bot
        log.warn(`User ${toChatId} has blocked the bot.`);
        return 403;
    }

    if (!response.ok) {
        const errorData = await response.json() as { description: string; };
        throw new Error(`Failed to copy message: ${response.status} - ${errorData.description}`);
    }

    await response.text();
    return response.status;
}

/**
 * Edits a media message in a specific Telegram chat.
 * @param chatId - The user's chat ID.
 * @param messageId - The ID of the message to edit.
 * @param media - An array of photo URLs (up to 4).
 * @param caption - The caption for the media.
 * @param env - The environment object.
 */

export async function editMediaMessage(
  chatId: number,
  messageId: number,
  media: string[], // Array of photo URLs (up to 4)
  caption: string | undefined,
  env: Env
): Promise<void> {
  if (!media || media.length === 0) {
    log.warn(`No media provided for editMediaMessage in chat ${chatId}`);
    return;
  }

  if (media.length > 4) {
    log.warn(`Too many media URLs provided for editMediaMessage in chat ${chatId}. Telegram API supports up to 10, but the function is limited to 4.`);
    media = media.slice(0, 4);
  }

  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageMedia`;

  const inputMedia = media.map((url) => ({
    type: 'photo',
    media: url,
    parse_mode: 'HTML'
  } as InputMediaPhoto));

  const body = {
    chat_id: chatId,
    message_id: messageId,
    media: {
      type: 'photo',
      media: inputMedia[0].media,
      caption: caption,
      parse_mode: 'HTML'
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    log.info(`Editing media message ${messageId} in chat ${chatId} with ${media.length} media items`);

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

    log.info(`Successfully edited media message ${messageId} in chat ${chatId}`);
  } catch (error) {
    clearTimeout(timeoutId);
    log.error(`Failed to edit media message ${messageId} in chat ${chatId}`, error);
    throw error;
  }
}

export async function createInlineKeyboard(
  chatId: number,
  buttons: Record<string, (...args: any[]) => Promise<void> | void>,
  env: Env,
  text = ''
): Promise<Record<string, string>> {
  // Returns a map of label => callback_data id so callers can reference them if needed
  if (!chatId || !buttons || Object.keys(buttons).length === 0) {
    log.warn('createInlineKeyboard called with no chatId or empty buttons');
    return {};
  }

  const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const replyKeyboard: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } = {
    inline_keyboard: []
  };

  const idMap: Record<string, string> = {};

  for (const label of Object.keys(buttons)) {
    // Use a stable prefix + uuid to generate short unique callback_data values.
    // crypto.randomUUID() is available in the Cloudflare Worker environment.
    const callbackId = `hg_${crypto.randomUUID()}`;
    replyKeyboard.inline_keyboard.push([{ text: label, callback_data: callbackId }]);
    // register the handler
    inlineKeyboardHandlers.set(callbackId, buttons[label]);
    idMap[label] = callbackId;
  }

  const body = {
    chat_id: chatId,
    text: text || ' ', // Telegram requires non-empty text when sending message
    parse_mode: 'HTML',
    reply_markup: replyKeyboard
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    log.info(`Sending inline keyboard with ${Object.keys(buttons).length} buttons to chat_id: ${chatId}`);

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json() as { description?: string };
      throw new Error(`Telegram API error while sending inline keyboard: ${response.status} - ${errorData.description}`);
    }

    log.info(`Successfully sent inline keyboard to chat_id: ${chatId}`);
    return idMap;
  } catch (error) {
    clearTimeout(timeoutId);
    log.error(`Failed to send inline keyboard to chat_id: ${chatId}`, error);
    // Cleanup registered handlers on failure
    for (const id of Object.values(idMap)) {
      inlineKeyboardHandlers.delete(id);
    }
    throw error;
  }
}