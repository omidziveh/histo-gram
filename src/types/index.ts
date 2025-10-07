export interface Env {
    DB: D1Database;
    ADMIN_CHAT_ID: number;

    STATE_KV: KVNamespace;
    RATE_LIMIT_KV: KVNamespace;

    BOT_TOKEN: string;
    OPENROUTER_API_KEY: string;
}

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    first_name: string;
    username?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TelegramMessage {
    message_id: number;
    from: TelegramUser;
    chat: TelegramChat;
    date: number;
    text: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
}

export interface User {
    chat_id: number;
    username?: string;
    subscribed: boolean;
    created_at: string;
}

export interface ObjectPool {
    object_id: string;
    checked: boolean;
}

export interface ObjectData {
    objectID: number;
    primaryImage: string;
    primaryImageSmall: string;
    additionalImages: string[]
    objectName: string;
    title: string;
    culture: string;
    period: string;
    objectBeginDate: number;
    objectEndDate: number;
    medium: string;
    dimensions: string;
    objectURL: string;
    artistRole: string,
    artistPrefix: string,
    artistDisplayName: string,
    artistDisplayBio: string,
    artistSuffix: string,
    artistAlphaSort: string,
    artistNationality: string,
    artistBeginDate: string,
    artistEndDate: string,
    artistGender: string,
    artistWikidata_URL: string,
    artistULAN_URL: string,
}

export interface ObjectDate {
    date: number;
    solar_date: string;
    shahanshahi_date: string;
}

export interface AIComment {
    comment: string;
}

export interface Translation {
    original_text: string;
    translated_text: string;
}

export interface BroadcastContent {
    imageUrl: string;
    caption: string;
}

export interface Message {
    content: string;
}

export interface Choice {
    message: Message;
}

export interface AIResponse {
    choices: Choice[];
}

export interface PreparedContent {
    objectData: ObjectData,
    objectId: string,
    photoUrls: string[],
    caption: string;
}