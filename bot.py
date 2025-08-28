import requests
import json
import os
import telegram
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# ----------------- FUNCTIONS ----------------- 

def get_object_content(id):
    object_url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/"
    object_response = requests.get(object_url+str(id))
    object_content = json.loads(object_response.text)
    return object_content

def get_image_url(object_content):
    image_address = object_content['primaryImage']
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
            parse_mode='HTML'
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

# ----------------- INIT ----------------- 

with open('id.txt', 'a'):
    pass
with open('log_id.txt', 'a'):
    pass

dotenv_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

# ----------------- MAIN ----------------- 

async def main():
    new_id = find_new_object_id()
    if new_id:
        object_content = get_object_content(new_id)
        if object_content:
            ai_explanation = get_ai_explanation(object_content=object_content)
            final_image_url = get_image_url(object_content)
            await send_telegram_message(ai_explanation, final_image_url)
            save_logged_id(new_id)

if __name__ == "__main__":
    asyncio.run(main())