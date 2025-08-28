
-----

# Persian Time Capsule Bot 📜

**Version: Beta 1.0**

A daily Telegram bot that delivers a beautiful piece of art and history from Persian culture. Every day, it selects a new artifact from The Metropolitan Museum of Art's collection, uses an AI to write a rich description, and sends it to you.

-----

## Features

  * **Daily Art Delivery:** Automatically runs once a day to find and send a new art piece.
  * **Museum-Quality Content:** Fetches high-quality images and verified data directly from **The Met's** public collection API.
  * **AI-Powered Descriptions:** Uses a powerful AI model to generate engaging, informative descriptions in Persian for each art piece, including the ruling dynasty of the era.
  * **Smart Logging:** Keeps track of every piece of art it has sent to ensure you never see the same one twice.

-----

## Setup & Installation

Follow these steps to get the bot running on your own machine.

### 1\. Clone the Repository

First, clone this repository to your local computer and navigate into the directory:

```bash
git clone https://github.com/omidziveh/persian-time-capsule-bot.git
cd persian-time-capsule-bot
```

### 2\. Create a Virtual Environment

It's highly recommended to create and activate a virtual environment for this project.

```bash
# Create the environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate

# Activate it (macOS/Linux)
source venv/bin/activate
```

### 3\. Install Dependencies

Install all the necessary Python libraries from the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 4\. Create a `.env` File

The bot needs secret API keys to function. Create a file named `.env` in the root of your project folder.

```bash
touch .env
```

Now, open the `.env` file and paste the following, replacing the placeholder text with your actual keys and ID:

```ini
# .env file

# Get from OpenRouter.ai
OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY_HERE"

# Get from Telegram's @BotFather
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN_HERE"

# Get from Telegram's @userinfobot
TELEGRAM_CHAT_ID="YOUR_PERSONAL_CHAT_ID_HERE"
```