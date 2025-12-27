from flask import Flask, request
import time
import sqlite3
import threading


app = Flask(__name__)


conn = sqlite3.connect("main.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    api_key TEXT,  # <- YOU WERE MISSING THIS
    reason TEXT,
    severity TEXT,
    timestamp REAL,
    resolved INTEGER DEFAULT 0  # <- AND THIS (to mark alerts as resolved)
)
""")
cursor.execute("""
CREATE TABLE IF NOT EXISTS blocked_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE,
    reason TEXT,
    blocked_at REAL,
    expires_at REAL
)
""")

cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")

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


def detection_engine():
    local_cursor = conn.cursor()
    while True:
        now = time.time()

        # ---- Rule 1: High request rate ----
        local_cursor.execute("""
            SELECT ip, COUNT(*) 
            FROM logs 
            WHERE timestamp > ?
            GROUP BY ip
        """, (now - 60,))
        for ip, count in local_cursor.fetchall():
            if count > 100:
                create_alert(ip, "High request rate", "HIGH")
        
        #failed authentication
        local_cursor.execute("""
            SELECT ip, COUNT(*) 
            FROM logs 
            WHERE timestamp > ?
            AND status_code IN (401, 403)
            GROUP BY ip
        """, (now - 600,))
        for ip, count in local_cursor.fetchall():
            if count > 5:
                create_alert(ip, "Multiple failed authentication attempts", "HIGH")
        
        #unusual endpoints
        local_cursor.execute("""
            SELECT DISTINCT ip 
            FROM logs 
            WHERE path = '/api/transaction'
        """)
        for (ip,) in local_cursor.fetchall():
            local_cursor.execute("""
                SELECT COUNT(*) 
                FROM logs 
                WHERE ip = ?
                AND path = '/api/balance'
            """, (ip,))

            balance_count = local_cursor.fetchone()[0]

            if balance_count == 0:
                create_alert(ip, "Transaction without balance check", "MEDIUM")

        time.sleep(60)


def create_alert(ip, reason, severity):
    cursor.execute("""
        SELECT COUNT(*) FROM alerts
        WHERE ip = ? AND reason = ? AND timestamp > ?
    """, (ip, reason, time.time() - 300))  # last 5 min

    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO alerts (ip, reason, severity, timestamp) VALUES (?, ?, ?, ?)",
            (ip, reason, severity, time.time())
        )
        conn.commit()




threading.Thread(target=detection_engine, daemon=True).start()

if __name__ == "__main__":
    app.run(debug=True)
