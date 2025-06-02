import os
from dotenv import load_dotenv
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID"))
RECEIVER_DETAILS = os.getenv("RECEIVER_DETAILS", "💳 2202 2020 3030 4040")
