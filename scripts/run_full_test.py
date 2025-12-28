import subprocess
import time
import requests
from datetime import datetime

BASE_URL = "http://localhost:5000"

def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def check_server():
    """Check if server is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/monitoring/stats", timeout=5)
        return response.status_code == 200
    except:
        return False

def get_dashboard_stats():
    """Fetch current dashboard statistics"""
    try:
        response = requests.get(f"{BASE_URL}/api/monitoring/stats", timeout=5)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return None

def print_stats(stats, label):
    """Print dashboard statistics"""
    print("\n" + "=" * 60)
    print(f"📊 DASHBOARD STATS - {label}")
    print("=" * 60)
    if stats:
        print(f"Total Requests:    {stats.get('total_requests', 0)}")
        print(f"Failed Requests:   {stats.get('failed_requests', 0)}")
        print(f"Active Alerts:     {stats.get('active_alerts', 0)}")
        print(f"Blocked Clients:   {stats.get('blocked_clients', 0)}")
    else:
        print("⚠️  Could not fetch stats")
    print("=" * 60 + "\n")

def main():
    print("\n" + "🎯" * 30)
    print("COMPREHENSIVE TESTING SUITE - TRACK 6")
    print("🎯" * 30 + "\n")
    
    # Check server
    log("Checking if server is running...")
    if not check_server():
        print("❌ Server is not running!")
        print("Please start the server first: python app.py")
        return
    
    log("✅ Server is running!")
    
    # Get baseline stats
    baseline_stats = get_dashboard_stats()
    print_stats(baseline_stats, "BASELINE (Before Tests)")
    
    # Phase 1: Normal Traffic
    log("=" * 60)
    log("PHASE 1: NORMAL TRAFFIC (2 minutes)")
    log("=" * 60)
    input("Press ENTER to start normal traffic simulation...")
    
    subprocess.run(["python", "test_normal_traffic.py"])
    
    time.sleep(5)
    normal_stats = get_dashboard_stats()
    print_stats(normal_stats, "AFTER NORMAL TRAFFIC")
    
    # Phase 2: Attack Traffic
    log("=" * 60)
    log("PHASE 2: ATTACK TRAFFIC")
    log("=" * 60)
    input("Press ENTER to start attack simulation...")
    
    subprocess.run(["python", "test_attack_traffic.py"])
    
    # Wait for detection engine to run (it runs every 60 seconds)
    log("\n⏳ Waiting 65 seconds for detection engine to analyze attacks...")
    for i in range(65, 0, -5):
        print(f"   {i} seconds remaining...", end="\r")
        time.sleep(5)
    print()
    
    time.sleep(5)
    attack_stats = get_dashboard_stats()
    print_stats(attack_stats, "AFTER ATTACK TRAFFIC")
    
    # Verification
    print("\n" + "✅" * 30)
    print("VERIFICATION CHECKLIST")
    print("✅" * 30 + "\n")
    
    if attack_stats:
        alerts_created = attack_stats.get('active_alerts', 0) > baseline_stats.get('active_alerts', 0)
        ips_blocked = attack_stats.get('blocked_clients', 0) > baseline_stats.get('blocked_clients', 0)
        
        print(f"✅ Alerts Created: {'YES' if alerts_created else 'NO'}")
        print(f"✅ IPs Blocked: {'YES' if ips_blocked else 'NO'}")
        print(f"✅ Failed Requests Logged: {attack_stats.get('failed_requests', 0)} total")
        
        print("\n📱 Open these URLs to verify visually:")
        print(f"   Dashboard:  {BASE_URL}/")
        print(f"   Logs:       {BASE_URL}/logs")
        print(f"   Alerts:     {BASE_URL}/alerts")
        print(f"   IP Mgmt:    {BASE_URL}/ip-management")
    
    print("\n" + "🎉" * 30)
    print("TESTING COMPLETE!")
    print("🎉" * 30 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
