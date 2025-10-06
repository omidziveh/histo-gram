import type { Env, TelegramMessage } from '../types';
import { sendMessage } from '../services/telegramApi';
import { findUserById, addUser, removeUser, getAllSubscribedUsers } from '../db/queries';
import { Logger } from '../utils/logger';
import { escapeMarkdown } from '../utils/caption';
import { getNewObjectId, processAndSendToUser } from "../handlers/scheduled";
import { isBetaTester } from '../utils/beta';

const log = new Logger('BotCommands');

export async function handleStart(message: TelegramMessage, env: Env): Promise<void> {
    const chatId = message.chat.id;
    const username = message.from?.username;

    try {
        const user = await findUserById(chatId, env);
        if (user) {
            console.log(`User ${chatId} (@${username}) already exists.`);
            return;
        }
        log.info(`New User ${chatId} added to the database.`);
        await addUser(chatId, username, env);
        const welcomeMessage = escapeMarkdown("Welcome! You have been added to the bot.");
        await sendMessage(chatId, welcomeMessage, env);
    } catch (error) {
        log.error('Error handling /start command:', error);
        await sendMessage(chatId, escapeMarkdown('An error occurred while processing your request.'), env);
    }
}

export async function handleStop(message: TelegramMessage, env: Env): Promise<void> {
    const chatId = message.chat.id;
    
    try {
        const user = await findUserById(chatId, env);
        if (!user) {
            console.log(`User ${chatId} does not exist.`);
            return;
        }
        await removeUser(chatId, env);
        const removeMessage = escapeMarkdown("You have been removed from the bot.");
        await sendMessage(chatId, removeMessage, env);
    } catch (error) {
        console.error('Error handling /stop command:', error);
        log.error('Error handling /stop command:', error);
        const errorMessage = escapeMarkdown("An error occurred while processing your request.");
        await sendMessage(chatId, errorMessage, env);
    }
}

export async function handleListUsers(message:TelegramMessage, env:Env): Promise<void> {
    const chatId = message.chat.id;
    const adminId = parseInt(env.ADMIN_CHAT_ID.toString(), 10);
    
    // SECURITY CHECK
    if (chatId !== adminId) {
        log.warn(`Unauthorized access attempt to users list by chatId ${chatId} (@${message.from?.username})`);
        return;
    }

    try {
        const users = await getAllSubscribedUsers(env);

        if (users.length === 0) {
            await sendMessage(chatId, escapeMarkdown("No subscribed users found."), env);
            return;
        }

        const usernameList = users
            .map(user => user.username ? `@${user.username}` : `ID: ${user.chat_id}`)
            .join('\n');

        await sendMessage(chatId, escapeMarkdown(`Subscribed users:\n\n${usernameList}`), env);
    } catch (error) {
        log.error('Error handling /listusers command:', error);
        await sendMessage(chatId, escapeMarkdown("An error occurred while processing your request."), env);
    }
}

export async function handleTestBroadcast(message:TelegramMessage, env:Env, ctx:ExecutionContext): Promise<void> {
    const chatId = message.chat.id;

    if (!isBetaTester(chatId, env)) {
        log.warn(`Unauthorized access attempt to test broadcast by chatId ${chatId} (@${message.from?.username})`);
        return;
    }

    ctx.waitUntil((async () => {
        try {
            log.info(`Sending test broadcast to chatId ${chatId} (@${message.from?.username})`);
            await sendMessage(chatId, escapeMarkdown("This is a test broadcast message."), env);

            const objectId = await getNewObjectId(env, true);
            if (!objectId) {
                log.warn('No new object ID available to send for test broadcast.');
                await sendMessage(chatId, escapeMarkdown("No new object ID available to send."), env);
                return;
            }
            log.info('object found');

            const success = await processAndSendToUser(chatId, objectId, env);
            if (success) {
                log.info(`Test broadcast successfully sent to chatId ${chatId} (@${message.from?.username})`);
                await sendMessage(chatId, escapeMarkdown("Test broadcast sent successfully."), env);
            } else {
                log.error(`Test broadcast failed to send to chatId ${chatId} (@${message.from?.username})`);
                await sendMessage(chatId, escapeMarkdown("Failed to send the test broadcast."), env);
            }
        } catch (error) {
            log.error('Error handling /testbroadcast command:', error);
            await sendMessage(chatId, escapeMarkdown("An error occurred while processing your request."), env);
        }
    })());
}

export async function handleUpdateUsernames(message: TelegramMessage, env: Env): Promise<void> {
    const chatId = message.chat.id;

    if (!isBetaTester(chatId, env)) {
        log.warn(`Unauthorized user ${chatId} attempted to update usernames.`);
        return;
    }

    try {
        log.info(`Admin ${chatId} started the username update process.`);
        await sendMessage(chatId, escapeMarkdown('🔄 Starting username update process... This may take a while.'), env);

        // 1. Find all users with a NULL username
        const usersToUpdate = await env.DB.prepare('SELECT chat_id FROM users WHERE username IS NULL;').all<{ chat_id: number }>();
        
        if (usersToUpdate.results.length === 0) {
            await sendMessage(chatId, escapeMarkdown('✅ All users already have a username.'), env);
            return;
        }

        await sendMessage(chatId, escapeMarkdown(`Found ${usersToUpdate.results.length} users to update.`), env);
        let updatedCount = 0;
        let failedCount = 0;

        // 2. Loop through each user and ask Telegram for their info
        for (const user of usersToUpdate.results) {
            try {
                const telegramUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/getChat?chat_id=${user.chat_id}`;
                const response = await fetch(telegramUrl);

                if (!response.ok) {
                    throw new Error(`Telegram API error: ${response.status}`);
                }

                const chatInfo = await response.json() as { result: { username: string } };
                const username = chatInfo.result.username;

                if (username) {
                    // 3. If a username is found, update the database
                    await env.DB.prepare('UPDATE users SET username = ?1 WHERE chat_id = ?2;')
                        .bind(username, user.chat_id)
                        .run();
                    updatedCount++;
                } else {
                    // User has no public username, which is fine.
                    log.info(`User ${user.chat_id} has no public username.`);
                }

            } catch (error) {
                // This can happen if the user blocked the bot
                log.error(`Failed to get info for user ${user.chat_id}:`, error);
                failedCount++;
            }
        }

        // 4. Report the results
        const finalMessage = `✅ Username update complete.\n\nUpdated: ${updatedCount}\nFailed: ${failedCount}`;
        await sendMessage(chatId, escapeMarkdown(finalMessage), env);

    } catch (error) {
        log.error('Error during username update process:', error);
        await sendMessage(chatId, escapeMarkdown('❌ An error occurred during the update process.'), env);
    }
}