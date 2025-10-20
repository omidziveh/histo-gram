import { generateComment, translateTtitle } from "../services/aiApi";
import { fetchObjectData } from "../services/objectApi";
import type { Env, ObjectData, PreparedContent } from "../types";
import { escapeMarkdown, generateDatePart } from "./caption";
import { Logger } from "./logger";

const log = new Logger('Memory');

let memory: PreparedContent | null = null;

export async function setMemory(objectId: string, env: Env): Promise<void> {
    log.info(`Setting memory for object ID: ${objectId}`);
    try {
        // 1. Fetch Object Data with Error Handling
        let objectData: ObjectData;
        try {
            objectData = await fetchObjectData(objectId, env);
        } catch (error) {
            log.error(`Failed to fetch object data for ID ${objectId}:`, error);
            throw new Error(`API Error: Could not fetch data for object ID ${objectId}.`);
        }

        // 2. Generate Comment with Error Handling
        let aiExplanation: string;
        try {
            aiExplanation = await generateComment(objectData, env);
        } catch (error) {
            log.error(`Failed to generate AI comment for ID ${objectId}:`, error);
            aiExplanation = "A beautiful piece from the collection."; // Fallback
        }

        // 3. Translate Title with Error Handling
        let translated_text: string;
        try {
            translated_text = await translateTtitle(objectData.title, env);
        } catch (error) {
            log.error(`Failed to translate title for ID ${objectId}:`, error);
            translated_text = objectData.title; // Fallback to original title
        }

        // 4. Assemble the memory object
        const photoUrls: string[] = [objectData.primaryImage, ...objectData.additionalImages.slice(0, 3)];
        const date_part = escapeMarkdown(generateDatePart(objectData.objectBeginDate, objectData.objectEndDate));
        const rawCaption = `<b><a href="${objectData.objectURL}">${translated_text}</a></b>\n${date_part}\n\n${aiExplanation}`;
        const escapedCaption = escapeMarkdown(rawCaption);

        memory = {
            objectData,
            objectId,
            photoUrls,
            caption: escapedCaption
        };
        log.info(`Memory set successfully for object ID: ${objectId}`);

    } catch (error) {
        log.error(`Catastrophic error in setMemory for ID ${objectId}:`, error);
        // Ensure memory is null if the entire process fails
        memory = null;
    }
}

export async function getMemory(): Promise<PreparedContent | null> {
    return memory;
}

export function clearMemory(): void {
    memory = null;
    log.info('Memory cleared');
}