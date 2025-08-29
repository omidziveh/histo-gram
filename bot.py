import requests
import json
import os
import telegram
import asyncio
import sqlite3
from pathlib import Path
from dotenv import load_dotenv

# ----------------- CONFIGURATION ----------------- 

VERSION = "Beta 1.1.0"

# ----------------- CONSTANTS ----------------- 

DB_FILE = "subscribers.db"

# ----------------- FUNCTIONS ----------------- 

def get_object_content(id):
    object_url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/"
    object_response = requests.get(object_url+str(id))
    object_content = json.loads(object_response.text)
    return object_content

def get_image_url(object_content):
    image_address = object_content.get('primaryImage')
    return image_address

def get_ai_explanation(object_content):
    api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        print("Error: OPENROUTER_API_KEY not found. Make sure your .env file is set up correctly.")
        return "توضیحات به دلیل مشکل در تنظیمات موجود نیست."
    prompt = f"""
    You are an expert art historian and museum curator fluent in Persian. Your task is to write a short, engaging, and informative paragraph (2-3 sentences) in simple, plain Persian about an art piece based on the data provided.

    In your explanation, be sure to mention which dynasty or empire (like Safavid, Qajar, etc.) was ruling in Iran during the object's creation period.

    Use all the data to infer the object's significance. Bring it to life for a general audience.

    Here is the data:
    - Title: {object_content['title']}
    - Culture: {object_content['culture']}
    - Period: {object_content['period']}
    - Medium: {object_content['medium']}
    - Start Date: {object_content['objectBeginDate']}
    - End Date: {object_content['objectEndDate']}

    Please provide ONLY the descriptive paragraph in Persian.
    """

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "HTTP-Referer": "https://github.com/omidziveh/persian-time-capsule-bot",
                "X-Title": "Persian Time Capsule Bot"
            },
            json={
                "model": "z-ai/glm-4.5-air:free",
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        response.raise_for_status()
        result = response.json()
        explanation = result['choices'][0]['message']['content'].strip()
        return explanation
    except Exception as e:
        print(f"An error occurred while getting AI explanation: {e}")
        return "توضیحات در حال حاضر موجود نیست."
    
def find_new_object_id():
    current_IDs = fetch_id()
    logged_id_list = []
    with open('log_id.txt', 'r+') as file:
        logged_id_list += [int(id) for id in file.readlines()]
    for id in current_IDs:
        if id not in logged_id_list:
            return id
    print("All objects have been seen.")
    return 

def save_logged_id(id):
    with open('log_id.txt', 'a+') as file:
        file.write(str(id)+'\n')

async def send_telegram_message(caption, image_url):
    load_dotenv()
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')

    try:
        bot = telegram.Bot(bot_token)
        await bot.send_photo(
            chat_id=chat_id,
            photo=image_url,
            caption=caption,
            parse_mode='MarkdownV2'
        )
    except Exception as e:
        print(f"ERR: {e}")

def fetch_id():
    islamic_art_department_id = 14
    search_url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId={islamic_art_department_id}&q=Persia&hasImages=true"
    response = requests.get(search_url)
    response.status_code

    current_IDs = []
    with open('id.txt', 'r+') as file:
        current_IDs += [int(id) for id in file.readlines()]
    for id in json.loads(response.text)['objectIDs']:
        if id not in current_IDs:
            with open('id.txt', 'a+') as file:
                file.write(str(id)+'\n')
            current_IDs.append(id)
    return current_IDs

def setup_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (chat_id INTEGER PRIMARY KEY)
    ''')
    conn.commit()
    conn.close()
    print('Setup Complete.')

def get_all_subscriber_ids():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT chat_id FROM users")
    ids = [item[0] for item in cursor.fetchall()]
    conn.close()
    return ids

async def process_new_subscribers(bot):
    print("Checking for new subscribers...")
    last_update_id = 0
    
    try:
        updates = await bot.get_updates(offset=last_update_id + 1, timeout=10)
    except Exception as e:
        print(f"Could not get updates from Telegram: {e}")
        return

    if not updates:
        print("No new messages found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    for update in updates:
        if update.message and update.message.text == '/start':
            chat_id = update.effective_chat.id
            logged_chat_ids = get_all_subscriber_ids()
            if chat_id not in logged_chat_ids:
                print(f"New user at /start: {chat_id}")
                cursor.execute("INSERT OR IGNORE INTO users (chat_id) VALUES (?)", (chat_id,))
                await bot.send_message(
                    chat_id=chat_id, 
                    text="Welcome! You are now subscribed and will receive your first artwork in the next daily broadcast."
                )
    
    conn.commit()
    conn.close()

def get_persian_title(english_title):
    if not english_title:
        print("Error: no title provided to the translator.")
        return
    
    prompt = f"""
    You are a direct translation tool. Your only job is to translate an English title into Persian. Follow these instructions perfectly.

    STRICT RULES:

    Your response MUST be the Persian translation and nothing else.

    ABSOLUTELY NO English words, explanations, or quotation marks.

    Example of perfect output:

    Input: Ancient Gold Coin from Sassanian Era

    Your Output: سکه طلای باستانی دوران ساسانی

    Now, perform your task on the following title:"{english_title}"
    """
    
    try:
        response = requests.post(
            url='https://openrouter.ai/api/v1/chat/completions',
            headers={"Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}" },
            json={
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        response.raise_for_status()
        result = response.json()
        persian_title = result['choices'][0]['message']['content'].strip()
        return persian_title
    except Exception as e:
        print(f"Error while translating the title: {e}")
        return
        
def escape_markdown(text):
    escape_chars = r'_*[]()~`>#+-=|{}.!'
    return ''.join(f'\\{char}' if char in escape_chars else char for char in text)

# ----------------- INIT ----------------- 

with open('id.txt', 'a'):
    pass
with open('log_id.txt', 'a'):
    pass

dotenv_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

# ----------------- MAIN ----------------- 

async def main():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env file.")
        return
        
    bot = telegram.Bot(token=bot_token)
    
    # STEP 1: Process any new subscribers first
    await process_new_subscribers(bot)
    
    # STEP 2: Now, find a new piece of art
    new_id = find_new_object_id()
    if not new_id:
        print("No new art to send today.")
        return
    
    art_details = get_object_content(new_id)
    if not art_details:
        print(f"Could not get details for ID {new_id}. Skipping.")
        return
        
    ai_explanation = get_ai_explanation(art_details)
    # ai_explanation = 'hey'
    
    final_image_url = get_image_url(art_details)
    if not final_image_url:
        print(f"No image URL for object {new_id}. Skipping.")
        return
    
    english_title = art_details.get('title', 'Untitled')
    final_title = escape_markdown(get_persian_title(english_title))
    final_date = escape_markdown(art_details.get('date', ''))
    safe_explanation = escape_markdown(ai_explanation or '')
    final_caption = f"*{final_title}* {final_date}\n\n{safe_explanation}"
    
    # STEP 3: Broadcast the message to all subscribers
    subscriber_ids = get_all_subscriber_ids()
    print(f"Broadcasting to {len(subscriber_ids)} users...")
    
    for chat_id in subscriber_ids:
        try:
            await bot.send_photo(
                chat_id=chat_id,
                photo=final_image_url,
                caption=final_caption,
                parse_mode='MarkdownV2'
            )
        except Exception as e:
            print(f"Failed to send to {chat_id}. Reason: {e}")
            
    save_logged_id(new_id)
    print("Broadcast finished.")

if __name__ == "__main__":
    setup_database()
    asyncio.run(main())