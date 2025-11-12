import sqlite3

def get_db():
    conn = sqlite3.connect("cupcake.db")
    conn.row_factory = sqlite3.Row
    return conn

def criar_banco():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    """)
    conn.commit()
    conn.close()
