from aiogram import types
from config import ADMIN_ID, RECEIVER_DETAILS
from db import get_games, book_game, add_game, get_game_participants

async def send_game_list(message, dp, bot):
    games = await get_games()
    if not games:
        await message.answer("Пока нет доступных игр.")
        return
    for game in games:
        text = f"📅 {game[1]}\n📍 {game[2]}\n👥 Макс: {game[3]}"
        keyboard = types.InlineKeyboardMarkup()
        keyboard.add(types.InlineKeyboardButton("Записаться", callback_data=f"book_{game[0]}"))
        await message.answer(text, reply_markup=keyboard)

async def handle_callback(callback_query: types.CallbackQuery, bot):
    data = callback_query.data
    if data.startswith("book_"):
        game_id = int(data.split("_")[1])
        await book_game(callback_query.from_user.id, callback_query.from_user.username, game_id)
        keyboard = types.InlineKeyboardMarkup()
        keyboard.add(types.InlineKeyboardButton("✅ Я оплатил", callback_data=f"confirm_{game_id}"))
        await callback_query.message.answer(
            f"🎉 Вы записались!
Переведите 500₽ на карту:
{RECEIVER_DETAILS}

После оплаты нажмите кнопку ниже:",
            reply_markup=keyboard
        )
    elif data.startswith("confirm_"):
        game_id = int(data.split("_")[1])
        await callback_query.message.answer("👌 Спасибо! Оплата будет проверена админом.")
        await bot.send_message(ADMIN_ID, f"💸 @{callback_query.from_user.username} подтвердил оплату за игру #{game_id}")

async def handle_admin(msg: types.Message):
    if msg.from_user.id != ADMIN_ID:
        await msg.answer("У вас нет доступа.")
        return
    await msg.answer("Введите данные новой игры в формате:
`дата_время;место;максимум`
Пример: `2025-06-05 19:00;Школа №2;12`", parse_mode="Markdown")

async def handle_new_game(msg: types.Message):
    if msg.from_user.id != ADMIN_ID:
        return
    try:
        parts = msg.text.split(";")
        dt, loc, max_p = parts[0], parts[1], int(parts[2])
        await add_game(dt, loc, max_p)
        await msg.answer("Игра успешно добавлена ✅")
    except:
        await msg.answer("Ошибка формата. Попробуйте снова.")
