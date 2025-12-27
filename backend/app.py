from flask import Flask, request
import time
import sqlite3
import threading
from flask_cors import CORS
import redis

app = Flask(__name__)
CORS(app)

try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    print("⚠️  Redis not available - rate limiting will use in-memory fallback")
    REDIS_AVAILABLE = False
    rate_limit_store = {}
    blocked_clients = set()



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
    timestamp REAL,
    user_agent TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    api_key TEXT,
    reason TEXT,
    severity TEXT,
    timestamp REAL,
    resolved INTEGER DEFAULT 0
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

# Create indexes for faster querying
cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")

conn.commit()

@app.before_request
def check_blocked():
    """Block requests from blocked clients"""
    client_id = get_client_identifier()
    
    if is_blocked(client_id):
        return jsonify({
            "error": "Access denied",
            "message": "Your access has been temporarily blocked"
        }), 403

@app.before_request
def apply_rate_limit():
    """Check and enforce rate limits"""
    client_id = get_client_identifier()
    
    if not check_rate_limit(client_id):
        create_alert(
            request.remote_addr,
            request.headers.get("X-API-Key", "none"),
            "Rate limit exceeded",
            "HIGH"
        )
        block_client(client_id, "Rate limit exceeded", duration=300)
        
        return jsonify({"error": "Too Many Requests"}), 429

@app.before_request
def start_timer():
    request.start_time = time.time()


@app.after_request
def log_request(response):
    response_time = time.time() - request.start_time
    api_key = request.headers.get("X-API-Key", "none")
    user_agent = request.headers.get("User-Agent", "unknown")  # ADD THIS

    cursor.execute(
        """
        INSERT INTO logs 
        (ip, path, method, status_code, response_time, api_key, timestamp, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            request.remote_addr,
            request.path,
            request.method,
            response.status_code,
            response_time,
            api_key,
            time.time(),
            user_agent
        )
    )
    conn.commit()
    return response

def get_client_identifier():
    ip = request.remote_addr
    api_key = request.headers.get("X-API-Key", "none")
    return f"{ip}:{api_key}"

def check_rate_limit(client_id):
    if REDIS_AVAILABLE:
        key = f"rate:limit:{client_id}"
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, 60)  # 60 second window
        return count <= 100
    else:
        # In-memory fallback
        now = time.time()
        if client_id not in rate_limit_store:
            rate_limit_store[client_id] = []
        
        rate_limit_store[client_id] = [t for t in rate_limit_store[client_id] if now - t < 60]
        rate_limit_store[client_id].append(now)
        return len(rate_limit_store[client_id]) <= 100

def is_blocked(client_id):
    if REDIS_AVAILABLE:
        return redis_client.sismember("blocked:clients", client_id)
    else:
        return client_id in blocked_clients

def block_client(client_id, reason, duration=3600):
    expires_at = time.time() + duration
    cursor.execute(
        "INSERT OR REPLACE INTO blocked_clients (identifier, reason, blocked_at, expires_at) VALUES (?, ?, ?, ?)",
        (client_id, reason, time.time(), expires_at)
    )
    conn.commit()
    
    if REDIS_AVAILABLE:
        redis_client.sadd("blocked:clients", client_id)
    else:
        blocked_clients.add(client_id)

def unblock_client(client_id):
    cursor.execute("DELETE FROM blocked_clients WHERE identifier = ?", (client_id,))
    conn.commit()
    
    if REDIS_AVAILABLE:
        redis_client.srem("blocked:clients", client_id)
    else:
        blocked_clients.discard(client_id)



#---

@app.route("/")
def home():
    return {"status":"backend is working"}

@app.route("/api/balance")
def balance():
    api_key = request.headers.get("X-API-Key")
    
    if not api_key or api_key == "none":
        return jsonify({"error": "API key required"}), 401
    
    return jsonify({
        "balance": 1000.00,
        "currency": "USD",
        "account_id": "ACC12345"
    })

@app.route("/api/transaction", methods=["POST"])
def transaction():
    api_key = request.headers.get("X-API-Key")
    
    if not api_key or api_key == "none":
        return jsonify({"error": "API key required"}), 401
    
    data = request.json or {}
    amount = data.get("amount", 0)
    recipient = data.get("recipient", "unknown")
    
    return jsonify({
        "status": "success",
        "transaction_id": f"TXN{int(time.time())}",
        "amount": amount,
        "recipient": recipient
    })

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


def create_alert(ip, api_key, reason, severity):  # ADD api_key parameter
    cursor.execute("""
        SELECT COUNT(*) FROM alerts
        WHERE ip = ? AND reason = ? AND timestamp > ?
    """, (ip, reason, time.time() - 300))

    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO alerts (ip, api_key, reason, severity, timestamp) VALUES (?, ?, ?, ?, ?)",
            (ip, api_key, reason, severity, time.time())  # PASS api_key
        )
        conn.commit()
        print(f"🚨 ALERT: {severity} - {reason} from {ip}")



threading.Thread(target=detection_engine, daemon=True).start()

if __name__ == "__main__":
    app.run(debug=True)
