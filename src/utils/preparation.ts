import { getNewObjectId, processAndSendToUser } from "../handlers/scheduled";
import { Logger } from "./logger";
import type { Env } from "../types";
import { setMemory } from "./memory";
import { sendMessage } from "../services/telegramApi";

const log = new Logger("Preparation");

export const PREPARATION_MESSAGE_KEY = 'MESSAGE-ID';


export async function handleRetryPreparation( env: Env ):Promise<boolean> {
    log.info('Retrying ...');
    let messageId:number;
    try {
        const msgId = await getPreparationMessageId(env);
        if (!msgId) {
            log.error('Could not find message ID in KV.');
            return false;
        }
        messageId = msgId;
    } catch(error) {
        log.error(`Failed to get message_id at retryPreparation function: ${error}`);
        return false;
    }

    try {
        processAndSendToUser(
            env.ADMIN_CHAT_ID,
            env,
            false,
            undefined,
            messageId
        )
    } catch (error) {
        log.error(`Failed to process and send user message: ${error}`);
        return false;
    }
    return true;
}

export async function handleSkipPreparation( env: Env ):Promise<boolean> {
    log.info('Skipping preparation for this object ...');
    try {
        const objectId = await getNewObjectId(env);
        if (!objectId) {
            log.error('Could not fetch next object. Failed');
            return false;
        }
        log.info(`Object with ID:${objectId} fetched. Setting to memory ...`);
        const success = setMemory(objectId, env);

        if (!success) {
            log.error('Failed while setting preparation in memory.');
            return false;
        }
        log.info('Succesfuly skipped object');
        return true;
    } catch (error) {
        log.error(`Critical error while skipping preparation: ${error}`);
        return false;
    }   
}

export async function handleApprovePreparation( env:Env ):Promise<void> {
    log.info('Approving preparation ...');
    try {
        await sendMessage(env.ADMIN_CHAT_ID, 'Preparation approved.', env);
    } catch (error) {
        log.error(`Failed to send approval message: ${error}`);
    }
}

export async function setPreparationMessageId( env: Env, messageId: number ): Promise<boolean> {
    try {
        await env.PREPARATION_KV.put(PREPARATION_MESSAGE_KEY, String(messageId));
        log.info(`Preparation message ID set to KV: ${messageId}`);
        return true;
    } catch (error) {
        log.error('Error setting preparation message ID in KV:', error);
        return false;
    }
}

export async function getPreparationMessageId( env: Env ): Promise<number | null> {
    try {
        const messageId = await env.PREPARATION_KV.get(PREPARATION_MESSAGE_KEY);
        if (!messageId) {
            log.warn('No preparation message ID found in KV.');
            return null;
        }
        log.info(`Retrieved preparation message ID from KV: ${messageId}`);
        return parseInt(messageId);
    } catch (error) {
        log.error('Error retrieving preparation message ID from KV:', error);
        return null;
    }
}

export async function clearPreparationMessageId( env: Env ): Promise<boolean> {
    try {
        await env.PREPARATION_KV.delete(PREPARATION_MESSAGE_KEY);
        log.info('Cleared preparation message ID from KV.');
        return true;
    } catch (error) {
        log.error('Error clearing preparation message ID from KV:', error);
        return false;
    }
}