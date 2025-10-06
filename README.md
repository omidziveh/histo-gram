# Histo-Gram: Daily Art Bot 🎨

A robust, serverless Telegram bot that delivers a daily piece of art and history from The Metropolitan Museum of Art's collection. Built with TypeScript and Cloudflare Workers, it's designed for high reliability and zero maintenance.

Every day, it selects a new artifact, uses AI to generate a description, and sends it directly to all subscribed users.

## ✨ Features

-   **🤖 Serverless & Scalable**: Runs on Cloudflare's global network, meaning it's fast, reliable, and has virtually no maintenance overhead.
-   **🖼️ Intelligent Media Sending**: Fetches high-quality images from The Met's API and sends them in a group. If an image fails to load, it intelligently retries with the remaining images, ensuring the user always gets content.
-   **🧠 AI-Powered Descriptions**: Integrates with an AI API to generate engaging, informative descriptions for each art piece.
-   **📝 Robust Text Formatting**: Uses HTML for message formatting, which is more reliable and less prone to errors than Markdown.
-   **🔒 Bulletproof Broadcasting**: Includes a sophisticated retry mechanism to handle temporary network issues, ensuring messages are delivered successfully.
-   **🛡️ Secure & Type-Safe**: Written in TypeScript to prevent common bugs and ensure code quality.
-   **📊 Comprehensive Logging**: Provides detailed logs for easy debugging and monitoring.
-   **👥 Beta Testing**: Includes admin-only commands for instant testing and user management.

## 🚀 Quick Start

This project is designed to be deployed on Cloudflare Workers. You cannot run it locally.

### Prerequisites

-   A [Cloudflare](https://www.cloudflare.com/) account (the free tier is sufficient).
-   A Telegram account.
-   The [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install/) installed.
-   API keys for:
    -   [The Met Museum API](https://metmuseum.github.io/) (Free)
    -   An AI service (e.g., OpenRouter.ai)
    -   A translation service (e.g., Google Translate API)

### 1. Clone the Repository

```bash
git clone https://github.com/omidziveh/histo-gram.git
cd histo-gram
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Wrangler

Log in to your Cloudflare account:

```bash
wrangler login
```

### 4. Set Up Your Database

Create a D1 database for the bot:

```bash
wrangler d1 create histo-gram-db
```

Copy the `database_id` from the output and add it to your `wrangler.jsonc` file.

Create the necessary tables by running the schema file:

```bash
wrangler d1 execute histo-gram-db --file=./src/db/schema.sql --remote --yes
```

Populate your `objects` table with the IDs from your SQL file:

```bash
wrangler d1 execute histo-gram-db --file=./path/to/your/objects.sql --remote --yes
```

### 5. Set Up Secrets

Store your secret API keys and tokens using Wrangler. Do not put them in your code.

```bash
# Your Bot Token from @BotFather
wrangler secret put BOT_TOKEN

# Your AI API Key
wrangler secret put AI_API_KEY

# Your Translation API Key
wrangler secret put TRANSLATION_API_KEY

# Your personal Chat ID for admin commands
wrangler secret put ADMIN_CHAT_ID
```

### 6. Deploy the Bot

Deploy your worker to Cloudflare:

```bash
wrangler deploy
```

### 7. Set the Webhook

Tell Telegram to send updates to your new Worker:

```bash
# Replace <YOUR_BOT_TOKEN> and <YOUR_WORKER_URL>
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>"
```

## 📋 Available Commands

-   `/start`: Subscribe to the daily broadcast.
-   `/stop`: Unsubscribe from the daily broadcast.
-   `/listusers` (Admin Only): Lists all subscribed users.
-   `/testbroadcast` (Admin Only): Instantly runs the broadcast process for testing.
-   `/updateusernames` (Admin Only): Updates the database with the latest usernames for all users.

## 🛠️ Development

### Project Structure

```
/src
├── index.ts                 # Main entry point and router
├── handlers/
│   ├── webhook.ts           # Handles incoming Telegram updates
│   └── scheduled.ts         # Handles the daily cron trigger
├── bot/
│   └── commands.ts          # Logic for each bot command
├── services/
│   ├── telegramApi.ts       # Functions for sending messages to Telegram
│   ├── objectApi.ts         # Functions for fetching data from The Met API
│   ├── aiApi.ts             # Functions for interacting with the AI service
│   └── translationApi.ts    # Functions for translating text
├── db/
│   ├── schema.sql           # Database table definitions
│   └── queries.ts           # Functions for interacting with the D1 database
├── types/
│   └── index.ts             # TypeScript type definitions
└── utils/
    ├── logger.ts            # Centralized logging utility
    ├── markdown.ts          # Utilities for text formatting
    ├── rateLimiter.ts       # Rate limiting logic
    └── retry.ts             # Generic retry mechanism for API calls
```

### Viewing Logs

To see real-time logs from your deployed Worker, run:

```bash
wrangler tail
```

### Changing the Schedule

To change the daily broadcast time, modify the `cron` expression in your `wrangler.jsonc` file. For example, to run it at 8:00 AM UTC every day:

```jsonc
"triggers": {
  "crons": [
    "0 8 * * *"
  ]
}
```

After changing the schedule, redeploy with `wrangler deploy`.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.