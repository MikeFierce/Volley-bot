import aiosqlite
from datetime import datetime

DB_PATH = "data/volley.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datetime TEXT,
                location TEXT,
                max_players INTEGER
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                game_id INTEGER,
                is_paid INTEGER
            )
        """)
        await db.commit()

async def get_games():
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT * FROM games ORDER BY datetime")
        return await cur.fetchall()

async def book_game(user_id, username, game_id):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT INTO bookings (user_id, username, game_id, is_paid) VALUES (?, ?, ?, 0)", (user_id, username, game_id))
        await db.commit()

async def add_game(datetime_str, location, max_players):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT INTO games (datetime, location, max_players) VALUES (?, ?, ?)", (datetime_str, location, max_players))
        await db.commit()

async def get_upcoming_games_in(hours):
    async with aiosqlite.connect(DB_PATH) as db:
        query = """
        SELECT id, datetime, location FROM games
        WHERE datetime BETWEEN datetime('now') AND datetime('now', ?)
        """
        cur = await db.execute(query, (f'+{hours} hours',))
        return await cur.fetchall()

async def get_game_participants(game_id):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT username FROM bookings WHERE game_id = ?", (game_id,))
        return await cur.fetchall()
