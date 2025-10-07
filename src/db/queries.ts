import type { Env, User, ObjectPool } from '../types';
import { Logger } from "../utils/logger";

const log = new Logger('QueriesDB')

// ===================
// USERS TABLE QUERIES
// ===================

/**
 * Finds a user by their chat ID.
 * @param chatId - The user's chat ID.
 * @param env - The environment object.
 * @returns The user object if found, otherwise null.
 */
export async function findUserById(chatId: number, env: Env): Promise<User | null> {
  const result = await env.DB.prepare('SELECT * FROM users WHERE chat_id = ?')
    .bind(chatId)
    .first<User>();
  return result;
}

/**
 * Adds a new user to the database.
 * Uses `INSERT OR IGNORE` to prevent errors if the user already exists.
 * @param chatId - The user's chat ID.
 * @param username - The user's optional username.
 * @param env - The environment object.
 */
export async function addUser(chatId: number, username: string | undefined, env: Env): Promise<void> {
  await env.DB.prepare('INSERT OR IGNORE INTO users (chat_id, username) VALUES (?, ?)')
    .bind(chatId, username)
    .run();
}

/**
 * Removes a user from the database by their chat ID.
 * @param chatId - The user's chat ID.
 * @param env - The environment object.
 */
export async function removeUser(chatId: number, env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM users WHERE chat_id = ?')
    .bind(chatId)
    .run();
}

/**
 * Retrieves all subscribed users.
 * @param env - The environment object.
 * @returns An array of user objects.
 */
export async function getAllSubscribedUsers(env: Env): Promise<User[]> {
  const results = await env.DB.prepare('SELECT * FROM users WHERE subscribed = 1')
    .all<User>();
  return results.results;
}


// =========================
// OBJECTS TABLE QUERIES
// =========================

/**
 * Resets all objects in the pool to 'unchecked'.
 * This is useful for restarting the broadcast cycle.
 * @param env - The environment object.
 */
export async function resetObjectPool(env: Env): Promise<void> {
  await env.DB.prepare('UPDATE objects SET checked = 0')
    .run();
  console.log('Object pool has been reset. All objects are now unchecked.');
}

/**
 * Finds the first object in the pool where 'checked' is FALSE,
 * updates it to TRUE, and returns its ID, all within a single atomic batch.
 * @param env - The environment object.
 * @returns The ID of the found object, or null if no unchecked objects are left.
 */
export async function getFirstUncheckedObject(env: Env): Promise<string | null> {
  // This is the correct, modern D1 approach. No BEGIN TRANSACTION.
  const findStmt = env.DB.prepare('SELECT id FROM objects WHERE checked = 0 LIMIT 1;');
  const updateStmt = env.DB.prepare('UPDATE objects SET checked = 1 WHERE id = ?1;');

  try {
    // The .batch() method runs all statements as a single, atomic transaction.
    const results = await env.DB.batch([
      findStmt,
      updateStmt.bind('placeholder_id') // We don't know the ID yet, so we bind a placeholder.
    ]);

    // The first result corresponds to our SELECT statement.
    const selectResult = results[0].results as { id: string }[];

    if (!selectResult || selectResult.length === 0) {
      console.log('No more unchecked objects in the pool.');
      return null;
    }

    const foundId = selectResult[0].id;

    // Now that we have the ID, we must run the UPDATE statement.
    await updateStmt.bind(foundId).run();

    console.log(`Selected and locked object ID for broadcast: ${foundId}`);
    return foundId;

  } catch (error) {
    console.error('Error during database batch operation for object selection:', error);
    throw error;
  }
}

/**
 * Finds the first object in the pool where 'checked' is FALSE,
 * updates it to TRUE, and returns its ID.
 * This is used to "skip" an object without sending it.
 * @param env - The environment object.
 * @returns The ID of the skipped object, or null if no unchecked objects are left.
 */
export async function skipNextObject(env: Env): Promise<string | null> {
    try {
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
            console.log('No more unchecked objects in the pool to skip.');
            return null;
        }

        console.log(`Skipped object ID: ${result.object_id}.`);
        return result.object_id;

    } catch (error) {
        console.error('Error during skip object operation:', error);
        throw error;
    }
}