// ip-management.js - Real Backend Integration
console.log("ip-management.js loaded");

class IPManager {
    constructor() {
        this.ips = [];
        this.init();
    }

    init() {
        this.initializeClock();
        this.setupEventListeners();
        this.loadIPs();
        this.updateStatistics();
    }
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('text-gray-400');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.classList.remove('text-gray-400');
        }

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // Show selected tab
        const target = document.getElementById(`${tabName}-tab`);
        if (target) {
            target.classList.remove('hidden');
        }
    }


    initializeClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            
            const timeElement = document.getElementById('current-time');
            if (timeElement) {
                timeElement.textContent = `${dateString} ${timeString}`;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    setupEventListeners() {
        // Add IP form
        const addForm = document.getElementById('add-ip-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addIP();
            });
        }

        // Search and filter
        const searchInput = document.getElementById('ip-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterIPs(e.target.value);
            });
        }

        const filterSelect = document.getElementById('ip-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterByStatus(e.target.value);
            });
        }
            // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(button.dataset.tab);
            });
        });
    }



    async loadIPs() {
        try {
            const response = await fetch('/api/ip-management/list');
            if (response.ok) {
                this.ips = await response.json();
                this.renderIPList();
                this.updateStatistics();
            } else {
                console.error('Failed to load IPs:', response.status);
                this.showNotification('Failed to load IP list', 'error');
            }
        } catch (error) {
            console.error('Error loading IPs:', error);
            this.showNotification('Error loading IP list', 'error');
        }
    }

    async addIP() {
        const ip = document.getElementById('ip-input').value.trim();
        const action = document.getElementById('ip-action').value;
        const reason = document.getElementById('ip-reason').value.trim();
        const duration = document.getElementById('ip-duration').value;

        if (!ip) {
            this.showNotification('Please enter an IP address', 'error');
            return;
        }

        // Basic IP validation
        if (!this.isValidIP(ip)) {
            this.showNotification('Invalid IP address format', 'error');
            return;
        }

        try {
            const response = await fetch('/api/ip-management/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip,
                    action,
                    reason: reason || 'Manual entry',
                    duration
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                
                // Clear form
                document.getElementById('add-ip-form').reset();
                
                // Reload list
                await this.loadIPs();
            } else {
                throw new Error('Failed to add IP');
            }
        } catch (error) {
            console.error('Error adding IP:', error);
            this.showNotification('Failed to add IP', 'error');
        }
    }

    async removeIP(identifier) {
        if (!confirm(`Are you sure you want to remove ${identifier}?`)) return;

        try {
            const response = await fetch('/api/ip-management/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });

            if (response.ok) {
                this.showNotification('IP removed successfully', 'success');
                await this.loadIPs();
            } else {
                throw new Error('Failed to remove IP');
            }
        } catch (error) {
            console.error('Error removing IP:', error);
            this.showNotification('Failed to remove IP', 'error');
        }
    }

    renderIPList() {
        const container = document.getElementById('ip-list');
        if (!container) return;

        if (this.ips.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">No IPs in management. Add one above.</div>';
            return;
        }

        const html = this.ips.map(ip => {
            const timeAgo = this.getTimeAgo(ip.addedAt * 1000);
            const statusClass = ip.active ? 'ip-blacklisted' : 'ip-expired';
            const statusColor = ip.active ? 'bg-red-500 text-white' : 'bg-gray-500 text-white';
            const expiresIn = ip.active ? this.getTimeRemaining(ip.expiresAt * 1000) : 'Expired';
            
            return `
                <div class="ip-row ${statusClass} bg-gray-900 bg-opacity-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-sm font-mono font-medium text-gray-100">${ip.ip}</span>
                                <span class="text-xs px-2 py-1 rounded ${statusColor}">${ip.active ? 'BLOCKED' : 'EXPIRED'}</span>
                                <span class="text-xs text-gray-400">${timeAgo}</span>
                            </div>
                            <p class="text-sm text-gray-400 mb-1">${ip.reason}</p>
                            <p class="text-xs text-gray-500">Expires: ${expiresIn}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${ip.active ? `
                                <button onclick="ipManager.removeIP('${ip.identifier}')" 
                                        class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Unblock</button>
                            ` : `
                                <button onclick="ipManager.removeIP('${ip.identifier}')" 
                                        class="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">Remove</button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Animate
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.ip-row',
                translateX: [-20, 0],
                opacity: [0, 1],
                duration: 400,
                delay: anime.stagger(50),
                easing: 'easeOutExpo'
            });
        }
    }

    filterIPs(searchTerm) {
        const rows = document.querySelectorAll('.ip-row');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterByStatus(status) {
        const rows = document.querySelectorAll('.ip-row');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else if (status === 'blacklist' && row.classList.contains('ip-blacklisted')) {
                row.style.display = '';
            } else if (status === 'expired' && row.classList.contains('ip-expired')) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    updateStatistics() {
        const blacklisted = this.ips.filter(ip => ip.active).length;
        const expired = this.ips.filter(ip => !ip.active).length;
        
        const blacklistedEl = document.getElementById('blacklisted-count');
        if (blacklistedEl) blacklistedEl.textContent = blacklisted;
        
        const whitelistedEl = document.getElementById('whitelisted-count');
        if (whitelistedEl) whitelistedEl.textContent = 0; // Not implemented yet
        
        const monitoredEl = document.getElementById('monitored-count');
        if (monitoredEl) monitoredEl.textContent = 0; // Not implemented yet
        
        const rulesEl = document.getElementById('rules-count');
        if (rulesEl) rulesEl.textContent = blacklisted;
    }

    isValidIP(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
        return ipv4Regex.test(ip) || cidrRegex.test(ip);
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    getTimeRemaining(timestamp) {
        const now = Date.now();
        const diff = timestamp - now;
        
        if (diff < 0) return 'Expired';
        
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m remaining`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h remaining`;
        
        const days = Math.floor(hours / 24);
        return `${days}d remaining`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = {
            'success': 'bg-green-600',
            'error': 'bg-red-600',
            'info': 'bg-blue-600'
        }[type] || 'bg-blue-600';
        
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${bgColor} text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        if (typeof anime !== 'undefined') {
            anime({
                targets: notification,
                translateX: [300, 0],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutExpo'
            });
        }
        
        setTimeout(() => {
            if (typeof anime !== 'undefined') {
                anime({
                    targets: notification,
                    translateX: [0, 300],
                    opacity: [1, 0],
                    duration: 300,
                    easing: 'easeInExpo',
                    complete: () => document.body.removeChild(notification)
                });
            } else {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize
let ipManager;
document.addEventListener('DOMContentLoaded', function() {
    ipManager = new IPManager();
    window.ipManager = ipManager;
    
    // Check for IP parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ipParam = urlParams.get('ip');
    if (ipParam) {
        const ipInput = document.getElementById('ip-input');
        if (ipInput) {
            ipInput.value = ipParam;
        }
    }
});