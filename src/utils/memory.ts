import { generateComment, translateTtitle } from "../services/aiApi";
import { fetchObjectData } from "../services/objectApi";
import type { Env, ObjectData, PreparedContent } from "../types";
import { escapeMarkdown, generateDatePart } from "./caption";
import { Logger } from "./logger";

const log = new Logger('Memory');

let memory: PreparedContent | null = null;

export async function setMemory(objectId: string, env: Env): Promise<void> {
    try {
        const objectData: ObjectData = await fetchObjectData(objectId, env);
        const photoUrls: string[] = [objectData.primaryImage, ...objectData.additionalImages.slice(0, 3)]

        const aiExplanation = await generateComment(objectData, env);
        const translated_text = await translateTtitle(objectData.title, env);
        const date_part = escapeMarkdown(generateDatePart(objectData.objectBeginDate, objectData.objectEndDate));
        const rawCaption = `<b><a href="${objectData.objectURL}">${translated_text}</a></b>\n${date_part}\n\n${aiExplanation}`;
        const escapedCaption = escapeMarkdown(rawCaption);

        memory = {
            objectData,
            objectId,
            photoUrls,
            caption: escapedCaption
        };
        log.info(`Memory set for object ID: ${objectId}`);
    } catch (error) {
        log.error('Error setting memory:', error);
    }
}

export async function getMemory(): Promise<PreparedContent | null> {
    return memory;
}

export function clearMemory(): void {
    memory = null;
    log.info('Memory cleared');
}