from flask import Flask, request
import time
import sqlite3


app = Flask(__name__)


conn = sqlite3.connect("main.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    path TEXT,
    method TEXT,
    status_code INTEGER,
    response_time REAL,
    api_key TEXT,
    timestamp REAL
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    reason TEXT,
    severity TEXT,
    timestamp REAL
)
""")

conn.commit()

#
@app.before_request
def start_timer():
    request.start_time = time.time()


@app.after_request
def log_request(response):
    response_time = time.time() - request.start_time

    api_key = request.headers.get("X-API-Key", "none")

    cursor.execute(
        """
        INSERT INTO logs 
        (ip, path, method, status_code, response_time, api_key, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            request.remote_addr,
            request.path,
            request.method,
            response.status_code,
            response_time,
            api_key,
            time.time()
        )
    )
    conn.commit()

    return response



@app.route("/")
def home():
    return {"status":"backend is working"}

@app.route("/api/balance")
def balance():
    return {"balance": 1000}

@app.route("/api/transaction", methods=["POST"])
def transaction():
    data = request.json
    return {"status": "transaction processed"}

@app.route("/api/history")
def history():
    return {
        "transactions": [
            {"id": 1, "amount": 200},
            {"id": 2, "amount": 450}
        ]
    }

@app.route("/api/admin/export")
def honeypot():
    ip = request.remote_addr

    cursor.execute(
        "INSERT INTO alerts (ip, reason, severity, timestamp) VALUES (?, ?, ?, ?)",
        (ip, "Honeypot access attempt", "CRITICAL", time.time())
    )
    conn.commit()

    return {"error": "unauthorized"}, 403



app.run(debug=True)

