import type { Env, ObjectData } from '../types';
import { Logger } from "../utils/logger";
import { retry } from "../utils/retry";

const log = new Logger('ObjectsAPIServices');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function containImage(data:ObjectData): boolean {
    if (data.primaryImage) {return true};
    if (data.additionalImages && data.additionalImages.length > 0) {return true};
    return false;
}

export async function fetchObjectData(id:string, env: Env): Promise<ObjectData> {
    const apiUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
    const response = await retry(() => fetch(apiUrl));
    const data: ObjectData = await response.json();
    if (!containImage(data)) {
        throw new Error(`No image available for object id: ${id}`);
    }
    return data;
}
// for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//         log.info('Attempt ${attempt}: Fetching data for ID ${id}');
//         const response = await fetch(apiUrl);
        
//         if (!response.ok) {
//             throw new Error('Failed to fetch data: ${response.status} ${response.statusText}');
//         }

//         const data: ObjectData = await response.json();
//         if (!containImage(data)) {
//             throw new Error('No image available for object ID ${id}');
//         }

//         log.info('Successfully fetched data for ID ${id}');
//         return data;
//     } catch (error) {
//         lastError = error instanceof Error ? error : new Error(String(error));
//         log.error('Error fetching data for ID ${id} on attempt ${attempt}:', error);

//         if (attempt < MAX_RETRIES) {
//             const delay = RETRY_DELAY_MS * attempt;
//             log.warn('Retrying in ${delay}ms... (Attempt ${attempt} of ${MAX_RETRIES})');
//             await new Promise(res => setTimeout(res, delay));
//         }
//     }
// }
// log.error('All attempts to fetch data for ID ${id} failed.');
// throw lastError || new Error('Unknown error occurred while fetching object data.');