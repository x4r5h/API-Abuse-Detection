import requests
import time
import random
from datetime import datetime
import threading

BASE_URL = "http://localhost:5000"

def log(message, level="INFO"):
    """Print timestamped log message with color"""
    colors = {
        "INFO": "\033[94m",   # Blue
        "ATTACK": "\033[91m", # Red
        "SUCCESS": "\033[92m", # Green
        "WARNING": "\033[93m"  # Yellow
    }
    reset = "\033[0m"
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"{colors.get(level, '')}{timestamp} [{level}] {message}{reset}")

# Attack 1: Rate Limit Abuse
def attack_rate_limit(attacker_ip="10.0.0.66", duration=30):
    """Send massive number of requests to trigger rate limiting"""
    log("=" * 60, "ATTACK")
    log("🚨 ATTACK 1: RATE LIMIT ABUSE", "ATTACK")
    log(f"Attacker IP: {attacker_ip}", "ATTACK")
    log(f"Target: >100 requests/minute", "ATTACK")
    log("=" * 60, "ATTACK")
    
    headers = {
        'X-API-Key': 'attacker_key_1',
        'X-Simulated-IP': attacker_ip,
        'User-Agent': 'AttackBot/1.0'
    }
    
    request_count = 0
    blocked_count = 0
    start_time = time.time()
    
    while time.time() - start_time < duration:
        try:
            # Rapid fire requests (no delay)
            response = requests.get(f"{BASE_URL}/api/balance", headers=headers, timeout=2)
            request_count += 1
            
            if response.status_code == 429:  # Rate limited
                blocked_count += 1
                log(f"🛑 Rate limited! Total requests: {request_count}, Blocked: {blocked_count}", "WARNING")
            elif response.status_code == 403:  # IP blocked
                log(f"🔒 IP BLOCKED after {request_count} requests!", "ATTACK")
                break
            else:
                if request_count % 20 == 0:
                    log(f"📤 Sent {request_count} requests...", "ATTACK")
                    
        except requests.exceptions.Timeout:
            log("⏱️  Request timeout", "WARNING")
        except requests.exceptions.ConnectionError:
            log("❌ Connection error - server may be protecting itself", "WARNING")
            time.sleep(1)
    
    log(f"📊 Attack summary: {request_count} requests, {blocked_count} rate limited", "ATTACK")
    log("", "ATTACK")

# Attack 2: Failed Authentication Brute Force
def attack_failed_auth(attacker_ip="10.0.0.77", attempts=15):
    """Repeatedly send failed authentication attempts"""
    log("=" * 60, "ATTACK")
    log("🚨 ATTACK 2: FAILED AUTHENTICATION BRUTE FORCE", "ATTACK")
    log(f"Attacker IP: {attacker_ip}", "ATTACK")
    log(f"Target: >{attempts} failed auth attempts", "ATTACK")
    log("=" * 60, "ATTACK")
    
    headers = {
        'X-API-Key': 'invalid_key_12345',  # Wrong API key
        'X-Simulated-IP': attacker_ip,
        'User-Agent': 'BruteForceBot/2.0'
    }
    
    for i in range(attempts):
        try:
            response = requests.get(f"{BASE_URL}/api/balance", headers=headers, timeout=2)
            
            if response.status_code == 401 or response.status_code == 403:
                log(f"🔑 Failed auth attempt #{i+1}: {response.status_code}", "ATTACK")
            elif response.status_code == 403 and "blocked" in response.text.lower():
                log(f"🔒 IP BLOCKED after {i+1} attempts!", "ATTACK")
                break
            
            time.sleep(random.uniform(0.5, 1.5))  # Small delay between attempts
            
        except Exception as e:
            log(f"❌ Error: {str(e)}", "WARNING")
    
    log("", "ATTACK")

# Attack 3: Transaction Without Balance Check
def attack_no_balance_check(attacker_ip="10.0.0.88", attempts=10):
    """Send transactions without checking balance first"""
    log("=" * 60, "ATTACK")
    log("🚨 ATTACK 3: SUSPICIOUS TRANSACTION PATTERN", "ATTACK")
    log(f"Attacker IP: {attacker_ip}", "ATTACK")
    log(f"Pattern: Transactions without balance checks", "ATTACK")
    log("=" * 60, "ATTACK")
    
    headers = {
        'X-API-Key': 'attacker_key_3',
        'X-Simulated-IP': attacker_ip,
        'User-Agent': 'SuspiciousApp/1.0'
    }
    
    for i in range(attempts):
        try:
            # Send transaction WITHOUT checking balance first (suspicious!)
            response = requests.post(
                f"{BASE_URL}/api/transaction",
                json={"amount": random.randint(100, 1000), "recipient": "unknown"},
                headers=headers,
                timeout=2
            )
            
            log(f"💸 Direct transaction #{i+1}: {response.status_code}", "ATTACK")
            time.sleep(random.uniform(1, 3))
            
        except Exception as e:
            log(f"❌ Error: {str(e)}", "WARNING")
    
    log("", "ATTACK")

# Attack 4: Admin Endpoint Probing
def attack_admin_probe(attacker_ip="10.0.0.99", attempts=5):
    """Try to access admin/honeypot endpoints"""
    log("=" * 60, "ATTACK")
    log("🚨 ATTACK 4: ADMIN ENDPOINT PROBING", "ATTACK")
    log(f"Attacker IP: {attacker_ip}", "ATTACK")
    log("=" * 60, "ATTACK")
    
    admin_paths = [
        "/api/admin/export",
        "/api/admin/users",
        "/api/admin/config",
        "/api/admin/delete",
        "/api/admin/logs"
    ]
    
    headers = {
        'X-API-Key': 'attacker_key_4',
        'X-Simulated-IP': attacker_ip,
        'User-Agent': 'AdminScanner/1.0'
    }
    
    for path in admin_paths[:attempts]:
        try:
            response = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=2)
            log(f"🔍 Probing {path}: {response.status_code}", "ATTACK")
            time.sleep(random.uniform(0.5, 2))
        except Exception as e:
            log(f"❌ Error: {str(e)}", "WARNING")
    
    log("", "ATTACK")

# Combined Attack Scenario
def run_combined_attack():
    """Run multiple attacks simultaneously"""
    log("=" * 80, "ATTACK")
    log("💥 RUNNING COMBINED ATTACK SCENARIO", "ATTACK")
    log("=" * 80, "ATTACK")
    log("")
    
    threads = []
    
    # Launch attacks in parallel
    attacks = [
        (attack_rate_limit, ("10.0.0.66", 20)),
        (attack_failed_auth, ("10.0.0.77", 12)),
        (attack_no_balance_check, ("10.0.0.88", 8)),
        (attack_admin_probe, ("10.0.0.99", 5))
    ]
    
    for attack_func, args in attacks:
        thread = threading.Thread(target=attack_func, args=args)
        thread.start()
        threads.append(thread)
        time.sleep(2)  # Stagger attack starts
    
    # Wait for all attacks to complete
    for thread in threads:
        thread.join()
    
    log("")
    log("=" * 80, "ATTACK")
    log("✅ ALL ATTACKS COMPLETED", "SUCCESS")
    log("=" * 80, "SUCCESS")
    log("")
    log("🔍 Check the dashboard to verify:", "INFO")
    log("   1. Alerts were created for each attack pattern", "INFO")
    log("   2. IPs were blocked automatically", "INFO")
    log("   3. Rate limits were applied", "INFO")
    log("   4. Logs show all malicious activity", "INFO")

if __name__ == "__main__":
    print("\n🎯 Attack Traffic Simulator")
    print("This script simulates various attack patterns")
    print("-" * 60)
    
    try:
        run_combined_attack()
    except KeyboardInterrupt:
        print("\n\n⚠️  Simulation stopped by user")
