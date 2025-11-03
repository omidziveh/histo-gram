import type { Env, User, ObjectData } from "../types";
import { getAllSubscribedUsers, skipNextObject } from "../db/queries";
import { fetchObjectData } from "../services/objectApi";
import { isError, Logger } from "../utils/logger";
import { generateComment, translateTtitle } from "../services/aiApi";
import { retry } from "../utils/retry";
import { copyMessages, editMediaMessage, sendMediaGroupToUser } from "../services/telegramApi";
import { escapeMarkdown, generateDatePart } from "../utils/caption";
import { clearMemory, getMemory, setMemory } from "../utils/memory";
import { getPreparationMessageIds, PREPARATION_MESSAGE_KEY, setPreparationMessageIds } from "../utils/preparation";
import { isUserBlocked } from "../utils/errorHandler";
const log = new Logger('ScheduledHandler')



/**
 * Gets a new object ID for the broadcast.
 * For beta tests, it finds an ID but does NOT mark it as checked.
 * For production runs, it finds an ID and marks it as checked atomically.
 * @param env - The environment object.
 * @param isBeta - If true, the object will not be marked as checked.
 * @returns The ID of the found object, or null if no unchecked objects are left.
 */
export async function getNewObjectId(env: Env, isBeta: boolean = false): Promise<string | null> {
    log.info(`Fetching new object ID. Beta mode: ${isBeta}`);

    try {
        if (isBeta) {
            const findStmt = env.DB.prepare('SELECT object_id FROM objects WHERE checked = FALSE LIMIT 1;');
            const result = await findStmt.first<{ object_id: string }>();

            if (!result) {
                log.info('No more unchecked objects in the pool for beta test.');
                return null;
            }

            log.info(`Beta test found object ID: ${result.object_id} (not marked as checked).`);
            return result.object_id;

        } else {
            const stmt = env.DB.prepare(`
                UPDATE objects 
                SET checked = TRUE 
                WHERE object_id = (
                    SELECT object_id FROM objects 
                    WHERE checked = FALSE 
                    LIMIT 1
                )
                RETURNING object_id;
            `);

            const result = await stmt.first<{ object_id: string }>();

            if (!result) {
                log.info('No more unchecked objects in the pool for production.');
                return null;
            }

            log.info(`Production run found and locked object ID: ${result.object_id}.`);
            return result.object_id;
        }

    } catch (error) {
        log.error('Error in getNewObjectId:', error);
        throw error;
    }
}

export async function processAndSendToUser(chatId:number, env:Env, initiate: boolean = false, objectId?:string, messageId?: number[]): Promise<boolean | number[]> {
    try {
        if (initiate && objectId) {
            log.info(`Initiating process for object ID: ${objectId}`, initiate);
            await setMemory(objectId, env);
        }
        const memory = await getMemory();
        
        const title = memory?.objectData.title || 'Untitled';
        const photoUrls = memory?.photoUrls || [];
        const caption = memory?.caption || '';

        if (photoUrls.length === 0) {
            log.warn(`No photos available to send for object ID ${objectId}.`);
            return false;
        }

        if (!messageId) { // send mode
            while (photoUrls.length > 0) {
                try {
                    log.info(`Attempting to send ${photoUrls.length} photos to user ${chatId}`);
                    var messageIds = await sendMediaGroupToUser(chatId, photoUrls, caption, env);
                    log.info(`[SUCCESS] Sent to ${chatId}: ${title}`);
                    log.info(`${messageIds}`);
                    if (messageIds) return messageIds;
                } catch (error) {
                    if (!isError(error)) {
                        log.error('Unknown error type encountered:', error);
                        throw error;
                    }

                    const errorMessage = error.message;
                    const match = errorMessage.match(/failed to send message #(\d+)/);

                    if (match && match[1]) {
                        const failedIndex = parseInt(match[1], 10) - 1;
                        const removedUrl = photoUrls[failedIndex];
                        photoUrls.splice(failedIndex, 1);
                        log.warn(`Image #${failedIndex + 1} (${removedUrl}) failed to send. Removing it and retrying with ${photoUrls.length} images.`);
                    } else {
                        log.error('Error does not indicate a specific failed image:', errorMessage);
                        throw error;
                    }
                }
            }
            log.error(`[FAILURE] All images failed to send to user ${chatId}.`);
            return false;
        } else {
            return false;
        }
        // else { // edit mode
        //     try {
        //         log.info(`Attempting to edit message ID ${messageId} for user ${chatId} with ${photoUrls.length} photos.`);
        //         await editMediaMessage(chatId, messageId, photoUrls, caption, env);
        //         log.info(`[SUCCESS] Edited message ID ${messageId} for user ${chatId}: ${title}`);
        //         return true;
        //     } catch (error) {
        //         log.error(`Failed to edit message ID ${messageId} for user ${chatId}.`, error);
        //         return false;
        //     }
        // }


    } catch (error) {
        const errorMessage = isError(error) ? error.message : String(error);
        log.error(`[FAILURE] Could not send to user ${chatId}. Reason:`, errorMessage);
        return false;
    }
    
}

export async function handleScheduled(env:Env): Promise<void> {
    log.info('Broadcasting...');
    let messageIds: number[] | null = null;
    try {
        messageIds = await getPreparationMessageIds(env);
    } catch (error) {
        log.error('Failed to retrieve preparation message ID:', error);
        return;
    }
    if (messageIds) {
        try {
            const users = await getAllSubscribedUsers(env);
            if (users.length === 0) {
                log.info('No subscribed users to send to.');
                return;
            }

            log.info(`Found ${users.length} subscribed users.`);
            
            const failedUsers: number[] = [];
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                const status = await copyMessages(user.chat_id, env.ADMIN_CHAT_ID, messageIds, env);
                if (status === 403) {
                    log.warn(`Skipping user ${user.chat_id} as they have blocked the bot.`);
                    continue;
                } else {
                    log.info(`Status code is ${status}`);
                }
                if (status !== 200) {
                    log.error(`Failed to send to user ${user.chat_id}. Status: ${status}`);
                    failedUsers.push(user.chat_id);
                } else {
                    log.info(`Successfully sent to user ${user.chat_id}.`);
                }
                // To avoid hitting rate limits, wait for 1 second between sends
                if (i < users.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (failedUsers.length > 0) {
                log.error(`Failed to send to ${failedUsers.length} users.`);
                const retriedUsers: number[] = [];
                for (let i = 0; i < failedUsers.length; i++) {
                    const chatId = failedUsers[i];
                    const status = await copyMessages(chatId, env.ADMIN_CHAT_ID, messageIds, env);
                    if (status === 403) {
                        log.warn(`User ${chatId} has blocked the bot. Skipping further retries.`);
                        continue;
                    }
                }
                log.warn(`Retries finished. Failed users: ${retriedUsers.length}`)
            } else {
                log.info('Successfully sent to all users.');
            }
            clearMemory();
            log.info('Broadcast process completed.');
            
        } catch (error) {
            log.error('A critical error occurred during the daily broadcast process:', error);
        }
    }
}

export async function handlePrepareScheduled(env:Env, scheduled:boolean=true): Promise<void> {
    log.info('Preparation job started...');
    if (scheduled) {
        try {
            await skipNextObject(env);
        } catch {
            log.error("Error while skipping...");
        }
    }
    try {
        const objectId = await getNewObjectId(env, true);
        if (!objectId) {
            log.warn('No new object ID available for preparation.');
            return;
        }
        
        log.info(`Using object ID ${objectId} for preparation.`);
        const success = await processAndSendToUser(
            env.ADMIN_CHAT_ID,
            env,
            true,
            objectId
        );
        log.error(`[BZZZZZ] ${success}`)
        if (!success) {
            log.error('Failed to send preparation message to admin.');
            return;
        } 
        log.info('Preparation message sent to admin successfully.');
        await setPreparationMessageIds(env, success as number[]);
        log.info('Preparation message ID stored successfully.');
    } catch (error) {
        log.error('A critical error occurred during the preparation process:', error);
    }
}