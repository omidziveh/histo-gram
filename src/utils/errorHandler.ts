import { Env } from "../types";
import { Logger } from "./logger";

const log = new Logger("ErrorHandlerUtils");


/**
 * Checks if a user has blocked the bot by trying to get chat info.
 * @param chatId - The user's chat ID.
 * @param env - The environment object.
 * @returns True if the user has blocked the bot, false otherwise.
 */
export async function isUserBlocked(chatId: number, env: Env): Promise<boolean> {
    const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/getChat?chat_id=${chatId}`;

    try {
        const response = await fetch(telegramUrl);

        if (response.status === 403) {
            // A 403 Forbidden error specifically means the user blocked the bot.
            log.warn(`User ${chatId} has blocked the bot.`);
            return true;
        }

        if (!response.ok) {
            // Any other error is a different problem, not a block.
            log.error(`Failed to get chat info for user ${chatId}: ${response.status}`);
            return false;
        }

        // If the request is successful, the user has not blocked the bot.
        return false;

    } catch (error) {
        log.error(`Network error while checking if user ${chatId} is blocked.`, error);
        return false; // Assume not blocked on network error
    }
}