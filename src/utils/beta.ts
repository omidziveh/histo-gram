import { Env } from "../types";

export function isBetaTester(chatId: number, env: Env): boolean {
    const adminId = parseInt(env.ADMIN_CHAT_ID.toString(), 10);
    return chatId === adminId;
}