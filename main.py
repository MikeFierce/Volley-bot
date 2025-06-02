import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import ContentType
from aiogram.utils import executor
from config import BOT_TOKEN, ADMIN_ID
from db import init_db, get_upcoming_games_in, get_game_participants
from handlers import send_game_list, handle_callback, handle_admin, handle_new_game

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def start(msg: types.Message):
    await msg.answer("Привет! Используй /games чтобы посмотреть ближайшие игры.")

@dp.message_handler(commands=['games'])
async def games(msg: types.Message):
    await send_game_list(msg, dp, bot)

@dp.callback_query_handler(lambda c: c.data.startswith("book_"))
async def callback(callback_query: types.CallbackQuery):
    await handle_callback(callback_query, bot)

@dp.message_handler(commands=['admin'])
async def admin(msg: types.Message):
    await handle_admin(msg)

@dp.message_handler(lambda msg: ";" in msg.text)
async def new_game(msg: types.Message):
    await handle_new_game(msg)

@dp.pre_checkout_query_handler(lambda q: True)
async def pre_checkout(pre_checkout_query: types.PreCheckoutQuery):
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@dp.message_handler(content_types=ContentType.SUCCESSFUL_PAYMENT)
async def success(message: types.Message):
    await message.answer("✅ Оплата прошла успешно! До встречи на игре!")

async def reminder_task():
    while True:
        games = await get_upcoming_games_in(2)
        for game in games:
            participants = await get_game_participants(game[0])
            for user in participants:
                await bot.send_message(user[0], f"Напоминание: у вас игра через 2 часа! 📍 {game[2]}")
        await asyncio.sleep(3600)

async def on_startup(dp):
    await init_db()
    asyncio.create_task(reminder_task())

if __name__ == "__main__":
    executor.start_polling(dp, on_startup=on_startup)
