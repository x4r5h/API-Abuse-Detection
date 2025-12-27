from flask import Flask, request
import time
import sqlite3


app = Flask(__name__)


conn = sqlite3.connect("sentinel.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    path TEXT,
    method TEXT,
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

@app.before_request
def log_request():
    cursor.execute(
        "INSERT INTO logs (ip, path, method, timestamp) VALUES (?, ?, ?, ?)",
        (
            request.remote_addr,
            request.path,
            request.method,
            time.time()
        )
    )
    conn.commit()


@app.route("/")
def home():
    return {"status":"backend is working"}

@app.route("/api/balance")
def balance():
    return {"balance": 1000}

@app.route("/api/transation", methods=["POST"])
def transation():
    data = request.json
    return {"status": "ok"}

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

