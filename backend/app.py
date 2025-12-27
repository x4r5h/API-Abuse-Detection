from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import sqlite3
import threading
import redis

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key"]
    }
})

try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    print("⚠️  Redis not available - rate limiting will use in-memory fallback")
    REDIS_AVAILABLE = False
    rate_limit_store = {}
    blocked_clients = set()

# Thread-local storage for database connections
thread_local = threading.local()

def get_db():
    """Get thread-local database connection"""
    if not hasattr(thread_local, 'conn'):
        thread_local.conn = sqlite3.connect("main.db", check_same_thread=False)
        thread_local.cursor = thread_local.conn.cursor()
    return thread_local.conn, thread_local.cursor

# Initialize database schema (only once at startup)
init_conn = sqlite3.connect("main.db")
init_cursor = init_conn.cursor()

init_cursor.execute("""
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

init_cursor.execute("""
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

init_cursor.execute("""
CREATE TABLE IF NOT EXISTS blocked_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE,
    reason TEXT,
    blocked_at REAL,
    expires_at REAL
)
""")

init_cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
init_cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip)")
init_cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")

init_conn.commit()
init_conn.close()

def is_monitoring_endpoint():
    """Check if current request is to monitoring API"""
    return request.path.startswith('/api/monitoring')

@app.before_request
def start_timer():
    request.start_time = time.time()

@app.before_request
def check_blocked():
    if not hasattr(request, 'start_time'):
        request.start_time = time.time()
    
    # Skip blocking check for monitoring endpoints
    if is_monitoring_endpoint():
        return None
    
    client_id = get_client_identifier()
    
    if is_blocked(client_id):
        return jsonify({
            "error": "Access denied",
            "message": "Your access has been temporarily blocked due to suspicious activity"
        }), 403

@app.before_request
def apply_rate_limit():
    if not hasattr(request, 'start_time'):
        request.start_time = time.time()
    
    # Skip rate limiting for monitoring endpoints
    if is_monitoring_endpoint():
        return None
    
    client_id = get_client_identifier()
    
    if not check_rate_limit(client_id):
        create_alert(
            request.remote_addr,
            request.headers.get("X-API-Key", "none"),
            "Rate limit exceeded",
            "HIGH"
        )
        block_client(client_id, "Rate limit exceeded", duration=300)
        
        return jsonify({
            "error": "Too Many Requests",
            "message": "Rate limit exceeded. Please try again later."
        }), 429

@app.after_request
def log_request(response):
    # Skip logging for monitoring endpoints
    if is_monitoring_endpoint():
        return response
    
    response_time = time.time() - getattr(request, 'start_time', time.time())
    api_key = request.headers.get("X-API-Key", "none")
    user_agent = request.headers.get("User-Agent", "unknown")

    conn, cursor = get_db()
    
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
            redis_client.expire(key, 60)
        return count <= 100
    else:
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
    
    conn, cursor = get_db()
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
    conn, cursor = get_db()
    cursor.execute("DELETE FROM blocked_clients WHERE identifier = ?", (client_id,))
    conn.commit()
    
    if REDIS_AVAILABLE:
        redis_client.srem("blocked:clients", client_id)
    else:
        blocked_clients.discard(client_id)

def create_alert(ip, api_key, reason, severity):
    conn, cursor = get_db()
    
    cursor.execute("""
        SELECT COUNT(*) FROM alerts
        WHERE ip = ? AND reason = ? AND timestamp > ?
    """, (ip, reason, time.time() - 300))

    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO alerts (ip, api_key, reason, severity, timestamp) VALUES (?, ?, ?, ?, ?)",
            (ip, api_key, reason, severity, time.time())
        )
        conn.commit()
        print(f"🚨 ALERT: {severity} - {reason} from {ip}")

@app.route("/")
def home():
    return jsonify({"status": "API Abuse Detection Platform - Backend Running"})

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
    return jsonify({
        "transactions": [
            {"id": 1, "amount": 200},
            {"id": 2, "amount": 450}
        ]
    })

@app.route("/api/monitoring/stats")
def get_stats():
    now = time.time()
    conn, cursor = get_db()
    
    cursor.execute("SELECT COUNT(*) FROM logs WHERE timestamp > ?", (now - 3600,))
    total_requests = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM logs WHERE timestamp > ? AND status_code >= 400", (now - 3600,))
    failed_requests = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE resolved = 0")
    active_alerts = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM blocked_clients WHERE expires_at > ?", (now,))
    blocked_count = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT path, COUNT(*) as count
        FROM logs WHERE timestamp > ?
        GROUP BY path ORDER BY count DESC LIMIT 5
    """, (now - 3600,))
    top_endpoints = [{"path": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    return jsonify({
        "total_requests": total_requests,
        "failed_requests": failed_requests,
        "active_alerts": active_alerts,
        "blocked_clients": blocked_count,
        "top_endpoints": top_endpoints
    })

@app.route("/api/monitoring/timeline")
def get_timeline():
    now = time.time()
    conn, cursor = get_db()
    
    cursor.execute("""
        SELECT CAST(timestamp / 60 AS INTEGER) * 60 as minute, COUNT(*) as count
        FROM logs WHERE timestamp > ?
        GROUP BY minute ORDER BY minute
    """, (now - 3600,))
    
    from datetime import datetime
    timeline = [
        {"timestamp": row[0], "time": datetime.fromtimestamp(row[0]).strftime("%H:%M"), "requests": row[1]}
        for row in cursor.fetchall()
    ]
    return jsonify(timeline)

@app.route("/api/monitoring/alerts")
def get_alerts():
    conn, cursor = get_db()
    
    cursor.execute("""
        SELECT id, ip, api_key, reason, severity, timestamp, resolved
        FROM alerts ORDER BY timestamp DESC LIMIT 50
    """)
    
    from datetime import datetime
    alerts = [
        {
            "id": row[0], "ip": row[1], "api_key": row[2],
            "reason": row[3], "severity": row[4],
            "timestamp": row[5],
            "time": datetime.fromtimestamp(row[5]).strftime("%Y-%m-%d %H:%M:%S"),
            "resolved": bool(row[6])
        }
        for row in cursor.fetchall()
    ]
    return jsonify(alerts)

@app.route("/api/monitoring/blocked")
def get_blocked():
    now = time.time()
    conn, cursor = get_db()
    
    cursor.execute("""
        SELECT identifier, reason, blocked_at, expires_at
        FROM blocked_clients WHERE expires_at > ?
        ORDER BY blocked_at DESC
    """, (now,))
    
    from datetime import datetime
    blocked = [
        {
            "identifier": row[0], "reason": row[1],
            "blocked_at": datetime.fromtimestamp(row[2]).strftime("%Y-%m-%d %H:%M:%S"),
            "expires_at": datetime.fromtimestamp(row[3]).strftime("%Y-%m-%d %H:%M:%S")
        }
        for row in cursor.fetchall()
    ]
    return jsonify(blocked)

@app.route("/api/monitoring/unblock", methods=["POST"])
def unblock():
    data = request.json
    client_id = data.get("identifier")
    
    if not client_id:
        return jsonify({"error": "identifier required"}), 400
    
    unblock_client(client_id)
    return jsonify({"status": "success", "message": f"Unblocked {client_id}"})

@app.route("/api/admin/export")
def honeypot():
    conn, cursor = get_db()
    
    cursor.execute(
        "INSERT INTO alerts (ip, api_key, reason, severity, timestamp) VALUES (?, ?, ?, ?, ?)",
        (request.remote_addr, request.headers.get("X-API-Key", "none"), "Honeypot access attempt", "CRITICAL", time.time())
    )
    conn.commit()

    return jsonify({"error": "unauthorized"}), 403

def detection_engine():
    while True:
        try:
            now = time.time()
            local_conn = sqlite3.connect("main.db")
            local_cursor = local_conn.cursor()
            
            local_cursor.execute("""
                SELECT ip, api_key, COUNT(*) as count
                FROM logs 
                WHERE timestamp > ?
                GROUP BY ip, api_key
            """, (now - 60,))
            
            for ip, api_key, count in local_cursor.fetchall():
                if count > 100:
                    create_alert(ip, api_key, f"High request rate ({count} req/min)", "HIGH")
            
            local_cursor.execute("""
                SELECT ip, api_key, COUNT(*) as count
                FROM logs 
                WHERE timestamp > ?
                AND status_code IN (401, 403)
                GROUP BY ip, api_key
            """, (now - 600,))
            
            for ip, api_key, count in local_cursor.fetchall():
                if count > 5:
                    create_alert(ip, api_key, f"Multiple failed auth ({count})", "HIGH")
                    block_client(f"{ip}:{api_key}", "Failed auth", duration=1800)
            
            local_cursor.execute("""
                SELECT DISTINCT ip, api_key
                FROM logs 
                WHERE path = '/api/transaction'
                AND timestamp > ?
            """, (now - 300,))
            
            for ip, api_key in local_cursor.fetchall():
                local_cursor.execute("""
                    SELECT COUNT(*) 
                    FROM logs 
                    WHERE ip = ? AND api_key = ?
                    AND path = '/api/balance'
                    AND timestamp > ?
                """, (ip, api_key, now - 300))
                
                if local_cursor.fetchone()[0] == 0:
                    create_alert(ip, api_key, "Transaction without balance check", "MEDIUM")
            
            local_cursor.execute("""
                SELECT ip, api_key, GROUP_CONCAT(path) as paths
                FROM logs
                WHERE timestamp > ?
                GROUP BY ip, api_key
            """, (now - 300,))
            
            for ip, api_key, paths in local_cursor.fetchall():
                if paths and '/api/admin' in paths:
                    create_alert(ip, api_key, "Admin endpoint access attempt", "HIGH")
            
            local_cursor.execute("DELETE FROM blocked_clients WHERE expires_at < ?", (now,))
            local_conn.commit()
            local_conn.close()
            
            time.sleep(60)
            
        except Exception as e:
            print(f"❌ Detection engine error: {e}")
            time.sleep(60)

threading.Thread(target=detection_engine, daemon=True).start()

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 API Abuse Detection Platform Backend")
    print("=" * 60)
    print("📊 Mock FinTech APIs:")
    print("   GET  /api/balance")
    print("   POST /api/transaction")
    print("   GET  /api/history")
    print("\n🔍 Monitoring APIs:")
    print("   GET  /api/monitoring/stats")
    print("   GET  /api/monitoring/timeline")
    print("   GET  /api/monitoring/alerts")
    print("   GET  /api/monitoring/blocked")
    print("   POST /api/monitoring/unblock")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)