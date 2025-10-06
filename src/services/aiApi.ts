import { AIResponse, Env, ObjectData } from "../types";
import { retry } from "../utils/retry";
import { Logger } from "../utils/logger";

const log = new Logger('AiAPIServices');

export async function generateComment(data:ObjectData, env: Env): Promise<string> {
    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const key = env.OPENROUTER_API_KEY;
    const prompt = `
    You are an expert art historian and museum curator, fluent in Persian. Your goal is to create a short, simple, and powerful description (2-3 sentences) that explain the object and its usages and how Iran has influence on it.

    ---
    STRICT THEMATIC FOCUS:
    Your entire description MUST focus on the object and its usages and Iran's influence on it. AVOID religious themes (like "Islamic art") and neutral terms like "cultural exchange." 

    ---
    CONTENT REQUIREMENTS:
    1.  Mention the ruling dynasty in Iran (e.g., Safavid, Qajar) during the object's creation to provide historical context from an Iranian perspective.
    2.  Use simple, plain Persian suitable for a general audience. Do not use overly academic language.
    3.  Do not include technical details like exact dimensions. Focus on the story and usage.
    4.  Make sure to give the user new information they likely don't know.
    5.  Tell the user why this object is interesting or important.
    6.  If the object has no clear Iranian connection, explain its significance in a global context briefly.
    7.  Make sure to explain about what the object is describing or telling.
    8.  If the artist is known, include a brief mention of their significance or style.

    ---
    OUTPUT FORMAT:
    Your final response MUST be ONLY the Persian descriptive paragraph and nothing else. No titles, no explanations, no English. 

    ---
    DATA FOR THE ART PIECE:
    - Title: ${data.title}
    - Culture: ${data.culture}
    - Period: ${data.period}
    - Medium: ${data.medium}
    - Start Date: ${data.objectBeginDate}
    - End Date: ${data.objectEndDate}
    - Dimensions: ${data.dimensions}
    - Artist Role: ${data.artistRole}
    - Artist Prefix: ${data.artistPrefix}
    - Artist Display Name: ${data.artistDisplayName}
    - Artist Display Bio: ${data.artistDisplayBio}
    - Artist Suffix: ${data.artistSuffix}
    - Artist Alpha Sort: ${data.artistAlphaSort}
    - Artist Nationality: ${data.artistNationality}
    - Artist Begin Date: ${data.artistBeginDate}
    - Artist End Date: ${data.artistEndDate}
    - Artist Gender: ${data.artistGender}
    - Artist Wikidata URL: ${data.artistWikidata_URL}
    - Artist ULAN URL: ${data.artistULAN_URL}
    `;

    try {
        return await retry(async () => {
            log.info(`Getting AI comment on the object with id: ${data.objectID}`);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {'Authorization': `Bearer ${key}`},
                body: JSON.stringify({
                    model: 'mistralai/mistral-small-3.2-24b-instruct:free',
                    messages: [{'role': 'user', 'content': prompt}],
                })
            })
            if (!response.ok) {
                throw new Error(`OpenRouter API error while generating comment: ${response.status} ${response.statusText}`);
            }
            const aiResponse: AIResponse = await response.json();
            return aiResponse.choices[0].message.content.trim();
        });
    } catch (error) {
        log.error('Failed to get AI comment:', error);
        return "توضیحی در دسترس نیست.";
    }
}

export async function translateTtitle(title:string, env: Env): Promise<string> {
    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const key = env.OPENROUTER_API_KEY;
    const prompt = `
    You are an expert translator and editor. Your job is to translate a potentially messy English title into a clean, formal, and academic Persian title for a museum.

    STRICT EDITING RULES:
    1.  Your final response MUST be the Persian translation and nothing else.
    2.  From the English source, IGNORE and DO NOT TRANSLATE any uncertainty markers like "(?)".
    3.  From the English source, IGNORE and DO NOT TRANSLATE redundant parenthetical text, such as "(Book of Kings)".
    4.  Format the final translation professionally using a colon (:) to separate the main subject from the description of the artwork.

    Now, apply these rules to the following messy title:
    ${title}
    `;

    try {
        return await retry(async () => {
            log.info(`translating title: ${title}`);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {'Authorization': `Bearer ${key}`},
                body: JSON.stringify({
                    model: 'mistralai/mistral-small-3.2-24b-instruct:free',
                    messages: [{'role': 'user', 'content': prompt}],
                })
            })
            if (!response.ok) {
                throw new Error(`OpenRouter API error while translating: ${response.status} ${response.statusText}`);
            }
            const aiResponse: AIResponse = await response.json();
            return aiResponse.choices[0].message.content.trim();
        });
    } catch (error) {
        log.error('Failed to translate title:', error);
        return title;
    }
}