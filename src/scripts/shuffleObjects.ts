// scripts/shuffle-objects.ts

// This is a script to run locally, not in the deployed Worker.
import { createClient } from '@libsql/client';

// Your database credentials from wrangler.jsonc
const DB_URL = "file:./.wrangler/state/v3/d1/histo-gram-db.sqlite3"; // Local DB path
const AUTH_TOKEN = "your_local_auth_token"; // Usually not needed for local

interface ObjectRow {
    object_id: string;
    checked: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function shuffleObjectsInDB() {
    console.log("Starting database shuffle...");
    const client = createClient({ url: DB_URL, authToken: AUTH_TOKEN });

    // 1. Fetch all objects from the database
    const allObjects = await client.execute("SELECT object_id, checked FROM objects;");
    console.log(`Found ${allObjects.rows.length} objects.`);

    // 2. Shuffle the array of objects with a safe type assertion
    const shuffledObjects = shuffleArray(allObjects.rows as unknown as ObjectRow[]);
    console.log("Objects shuffled in memory.");

    // 3. Update the database with the new order
    // We'll create a temporary table to hold the new order
    await client.execute("DROP TABLE IF EXISTS objects_shuffled_temp;");
    await client.execute("CREATE TABLE objects_shuffled_temp (id INTEGER PRIMARY KEY, object_id TEXT, checked BOOLEAN);");

    for (let i = 0; i < shuffledObjects.length; i++) {
        const obj = shuffledObjects[i];
        await client.execute({
            sql: "INSERT INTO objects_shuffled_temp (id, object_id, checked) VALUES (?, ?, ?);",
            args: [i + 1, obj.object_id, obj.checked]
        });
    }
    console.log("Temporary table created and populated.");

    // 4. Replace the old table with the new one
    await client.execute("DROP TABLE objects;");
    await client.execute("ALTER TABLE objects_shuffled_temp RENAME TO objects;");
    console.log("Database table replaced with shuffled version.");
    console.log("Shuffle complete!");
}

shuffleObjectsInDB().catch(console.error);