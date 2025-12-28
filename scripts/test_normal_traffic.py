import requests
import time
import random
from datetime import datetime

BASE_URL = "http://localhost:5000"

# Simulate legitimate users
LEGITIMATE_USERS = [
    {"ip": "192.168.1.10", "api_key": "user_alice_key"},
    {"ip": "192.168.1.11", "api_key": "user_bob_key"},
    {"ip": "192.168.1.12", "api_key": "user_charlie_key"},
]

def log(message):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def simulate_normal_user(user, duration_seconds=60):
    """Simulate a normal user's behavior"""
    log(f"👤 Normal user {user['api_key']} starting session from {user['ip']}")
    
    start_time = time.time()
    request_count = 0
    
    while time.time() - start_time < duration_seconds:
        try:
            # Random delay between requests (2-10 seconds - normal human behavior)
            delay = random.uniform(2, 10)
            time.sleep(delay)
            
            # Simulate normal user flow
            action = random.choice(['check_balance', 'view_history', 'make_transaction'])
            
            headers = {
                'X-API-Key': user['api_key'],
                'X-Simulated-IP': user['ip'],  # Simulate different IPs
                'User-Agent': 'LegitimateApp/1.0'
            }
            
            if action == 'check_balance':
                response = requests.get(f"{BASE_URL}/api/balance", headers=headers)
                log(f"✅ {user['api_key']}: Check balance - {response.status_code}")
                
            elif action == 'view_history':
                response = requests.get(f"{BASE_URL}/api/history", headers=headers)
                log(f"✅ {user['api_key']}: View history - {response.status_code}")
                
            elif action == 'make_transaction':
                # First check balance (normal behavior)
                requests.get(f"{BASE_URL}/api/balance", headers=headers)
                time.sleep(0.5)
                
                # Then make transaction
                response = requests.post(
                    f"{BASE_URL}/api/transaction",
                    json={"amount": random.randint(10, 500), "recipient": "merchant_123"},
                    headers=headers
                )
                log(f"✅ {user['api_key']}: Transaction - {response.status_code}")
            
            request_count += 1
            
        except requests.exceptions.ConnectionError:
            log(f"❌ Connection failed for {user['api_key']}")
            time.sleep(5)
        except Exception as e:
            log(f"❌ Error for {user['api_key']}: {str(e)}")
    
    log(f"📊 {user['api_key']}: Session ended. Total requests: {request_count}")

def run_normal_traffic(duration_minutes=5):
    """Run normal traffic simulation"""
    log("=" * 60)
    log("🟢 STARTING NORMAL TRAFFIC SIMULATION")
    log("=" * 60)
    log(f"Duration: {duration_minutes} minutes")
    log(f"Users: {len(LEGITIMATE_USERS)}")
    log("")
    
    import threading
    
    threads = []
    for user in LEGITIMATE_USERS:
        thread = threading.Thread(
            target=simulate_normal_user, 
            args=(user, duration_minutes * 60)
        )
        thread.start()
        threads.append(thread)
        time.sleep(1)  # Stagger user starts
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join()
    
    log("")
    log("=" * 60)
    log("✅ NORMAL TRAFFIC SIMULATION COMPLETED")
    log("=" * 60)

if __name__ == "__main__":
    print("\n🎯 Normal Traffic Simulator")
    print("This script simulates legitimate user behavior")
    print("-" * 60)
    
    try:
        run_normal_traffic(duration_minutes=2)  # Run for 2 minutes
    except KeyboardInterrupt:
        print("\n\n⚠️  Simulation stopped by user")