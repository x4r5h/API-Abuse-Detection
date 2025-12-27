// logs.js - Fixed to filter out monitoring endpoints

class LogAnalyzer {
    constructor() {
        this.logs = [];
        this.filteredLogs = [];
        this.currentFilters = {
            search: '',
            ip: '',
            method: '',
            status: '',
            timeRange: 1
        };
        this.autoRefreshInterval = null;
        this.init();
    }

    init() {
        this.initializeClock();
        this.setupEventListeners();
        this.loadLogs();
        this.startAutoRefresh();
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
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.filterLogs();
            });
        }

        const filterToggle = document.getElementById('filter-toggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                const panel = document.getElementById('filter-panel');
                if (panel) {
                    panel.classList.toggle('expanded');
                }
            });
        }

        const filterIp = document.getElementById('filter-ip');
        if (filterIp) {
            filterIp.addEventListener('input', (e) => {
                this.currentFilters.ip = e.target.value;
                this.filterLogs();
            });
        }

        const filterMethod = document.getElementById('filter-method');
        if (filterMethod) {
            filterMethod.addEventListener('change', (e) => {
                this.currentFilters.method = e.target.value;
                this.filterLogs();
            });
        }

        const filterStatus = document.getElementById('filter-status');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.filterLogs();
            });
        }

        const filterTime = document.getElementById('filter-time');
        if (filterTime) {
            filterTime.addEventListener('change', (e) => {
                this.currentFilters.timeRange = parseInt(e.target.value);
                this.filterLogs();
            });
        }

        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLogs();
            });
        }

        const clearLogs = document.getElementById('clear-logs');
        if (clearLogs) {
            clearLogs.addEventListener('click', () => {
                this.loadLogs();
            });
        }

        const autoRefresh = document.getElementById('auto-refresh');
        if (autoRefresh) {
            autoRefresh.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/monitoring/logs');
            if (response.ok) {
                const logsData = await response.json();
                
                // Filter out monitoring endpoints and static files
                this.logs = logsData
                    .filter(log => !log.path.startsWith('/api/monitoring') && 
                                   !log.path.startsWith('/static') &&
                                   log.path !== '/' &&
                                   log.path !== '/logs' &&
                                   log.path !== '/logs.html' &&
                                   log.path !== '/index' &&
                                   log.path !== '/index.html' &&
                                   log.path !== '/alerts' &&
                                   log.path !== '/alerts.html' &&
                                   log.path !== '/favicon.ico' &&
                                   log.path !== '/api/ip-management/list' &&
                                   log.path !== '/ip-management/')
                    .map((log, index) => ({
                        id: index + 1,
                        ip: log.ip,
                        path: log.path,
                        method: log.method,
                        statusCode: log.status_code,
                        responseTime: log.response_time,
                        timestamp: log.timestamp * 1000,
                        userAgent: log.user_agent,
                        apiKey: log.api_key
                    }));
                
                this.filterLogs();
                this.updateStatistics();
            } else {
                console.error('Failed to load logs:', response.status);
                this.showNotification('Failed to load logs', 'error');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showNotification('Error loading logs. Retrying...', 'error');
        }
    }

    filterLogs() {
        const now = Date.now();
        const timeRangeMs = this.currentFilters.timeRange * 60 * 60 * 1000;
        
        this.filteredLogs = this.logs.filter(log => {
            if (now - log.timestamp > timeRangeMs) {
                return false;
            }

            if (this.currentFilters.search) {
                const searchLower = this.currentFilters.search.toLowerCase();
                if (!log.ip.toLowerCase().includes(searchLower) &&
                    !log.path.toLowerCase().includes(searchLower) &&
                    !log.userAgent.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            if (this.currentFilters.ip && !log.ip.includes(this.currentFilters.ip)) {
                return false;
            }

            if (this.currentFilters.method && log.method !== this.currentFilters.method) {
                return false;
            }

            if (this.currentFilters.status && log.statusCode !== parseInt(this.currentFilters.status)) {
                return false;
            }

            return true;
        });

        this.renderLogs();
        this.updateStatistics();
        this.updateActiveFilters();
    }

    renderLogs() {
        const container = document.getElementById('log-stream');
        if (!container) return;

        if (this.filteredLogs.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">No API logs found. Generate traffic by making requests to /api/* endpoints.</div>';
            return;
        }

        const html = this.filteredLogs.slice(0, 100).map(log => {
            const timeAgo = this.getTimeAgo(log.timestamp);
            const statusClass = this.getStatusClass(log.statusCode);
            const methodClass = `method-${log.method.toLowerCase()}`;
            
            return `
                <div class="log-row ${statusClass} bg-gray-900 bg-opacity-50 p-4 rounded-lg cursor-pointer" 
                     onclick="showLogDetails(${log.id})">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-4">
                            <span class="text-xs text-gray-400 font-mono">${timeAgo}</span>
                            <span class="text-xs px-2 py-1 bg-gray-700 rounded ${methodClass} font-mono">${log.method}</span>
                            <span class="text-xs px-2 py-1 bg-gray-700 rounded font-mono">${log.statusCode}</span>
                            <span class="text-xs text-gray-400 font-mono">${log.ip}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-400 font-mono">${log.responseTime}ms</span>
                            <button onclick="event.stopPropagation(); blockIP('${log.ip}')" 
                                    class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Block</button>
                        </div>
                    </div>
                    <div class="text-sm text-gray-300 font-mono">${log.path}</div>
                    <div class="text-xs text-gray-500 mt-1">${log.userAgent}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        if (typeof anime !== 'undefined') {
            anime({
                targets: '.log-row',
                translateX: [-20, 0],
                opacity: [0, 1],
                duration: 400,
                delay: anime.stagger(30),
                easing: 'easeOutExpo'
            });
        }
    }

    updateStatistics() {
        const totalLogs = this.filteredLogs.length;
        const errorLogs = this.filteredLogs.filter(log => log.statusCode >= 400).length;
        const avgResponse = totalLogs > 0 
            ? this.filteredLogs.reduce((sum, log) => sum + log.responseTime, 0) / totalLogs 
            : 0;
        const uniqueIPs = new Set(this.filteredLogs.map(log => log.ip)).size;

        const totalLogsEl = document.getElementById('total-logs');
        if (totalLogsEl) totalLogsEl.textContent = totalLogs.toLocaleString();

        const errorRateEl = document.getElementById('error-rate');
        if (errorRateEl) {
            const errorRate = totalLogs > 0 ? Math.round((errorLogs / totalLogs) * 100) : 0;
            errorRateEl.textContent = `${errorRate}%`;
        }

        const avgResponseEl = document.getElementById('avg-response');
        if (avgResponseEl) avgResponseEl.textContent = `${Math.round(avgResponse)}ms`;

        const uniqueIpsEl = document.getElementById('unique-ips');
        if (uniqueIpsEl) uniqueIpsEl.textContent = uniqueIPs.toLocaleString();
    }

    updateActiveFilters() {
        const container = document.getElementById('active-filters');
        const countEl = document.getElementById('filter-count');
        if (!container) return;

        const activeFilters = [];
        if (this.currentFilters.ip) activeFilters.push(`IP: ${this.currentFilters.ip}`);
        if (this.currentFilters.method) activeFilters.push(`Method: ${this.currentFilters.method}`);
        if (this.currentFilters.status) activeFilters.push(`Status: ${this.currentFilters.status}`);
        if (this.currentFilters.search) activeFilters.push(`Search: ${this.currentFilters.search}`);

        if (activeFilters.length === 0) {
            container.innerHTML = '';
            if (countEl) countEl.classList.add('hidden');
        } else {
            container.innerHTML = activeFilters.map(filter => 
                `<span class="filter-chip text-xs px-2 py-1 rounded-full">${filter}</span>`
            ).join('');
            if (countEl) {
                countEl.textContent = activeFilters.length;
                countEl.classList.remove('hidden');
            }
        }
    }

    clearAllFilters() {
        this.currentFilters = {
            search: '',
            ip: '',
            method: '',
            status: '',
            timeRange: 1
        };

        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        
        const filterIp = document.getElementById('filter-ip');
        if (filterIp) filterIp.value = '';
        
        const filterMethod = document.getElementById('filter-method');
        if (filterMethod) filterMethod.value = '';
        
        const filterStatus = document.getElementById('filter-status');
        if (filterStatus) filterStatus.value = '';
        
        const filterTime = document.getElementById('filter-time');
        if (filterTime) filterTime.value = '1';

        this.filterLogs();
    }

    getStatusClass(statusCode) {
        if (statusCode >= 500) return 'log-status-500';
        if (statusCode >= 400) return 'log-status-400';
        return 'log-status-200';
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    exportLogs() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api_logs_${new Date().toISOString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification(`Exported ${this.filteredLogs.length} logs`, 'success');
    }

    generateCSV() {
        const headers = ['Timestamp', 'IP', 'Method', 'Path', 'Status', 'Response Time (ms)', 'User Agent'];
        const rows = this.filteredLogs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.ip,
            log.method,
            log.path,
            log.statusCode,
            log.responseTime,
            log.userAgent
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.loadLogs();
        }, 5000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
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

function showLogDetails(logId) {
    const log = logAnalyzer.logs.find(l => l.id === logId);
    if (!log) return;

    const modal = document.getElementById('log-modal');
    const content = document.getElementById('modal-content');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
                    <p class="text-sm text-gray-100">${new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">IP Address</label>
                    <p class="text-sm text-gray-100 font-mono">${log.ip}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Method</label>
                    <p class="text-sm text-gray-100 font-mono">${log.method}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Status Code</label>
                    <p class="text-sm text-gray-100 font-mono">${log.statusCode}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">Response Time</label>
                    <p class="text-sm text-gray-100 font-mono">${log.responseTime}ms</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400 mb-1">API Key</label>
                    <p class="text-sm text-gray-100 font-mono">${log.apiKey}</p>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Path</label>
                <p class="text-sm text-gray-100 font-mono bg-gray-900 p-2 rounded">${log.path}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">User Agent</label>
                <p class="text-sm text-gray-100 font-mono bg-gray-900 p-2 rounded">${log.userAgent}</p>
            </div>
            <div class="flex space-x-2 pt-4">
                <button onclick="blockIP('${log.ip}')" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Block IP</button>
                <button onclick="closeLogModal()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeLogModal() {
    const modal = document.getElementById('log-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function blockIP(ip) {
    if (!confirm(`Are you sure you want to block IP ${ip}?`)) return;

    try {
        const response = await fetch('/api/monitoring/block-ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, reason: 'Blocked from logs page', duration: 3600 })
        });

        if (response.ok) {
            showNotification(`IP ${ip} has been blocked`, 'success');
        } else {
            throw new Error('Failed to block IP');
        }
    } catch (error) {
        console.error('Error blocking IP:', error);
        showNotification('Failed to block IP', 'error');
    }
}

function showNotification(message, type) {
    if (window.logAnalyzer) {
        window.logAnalyzer.showNotification(message, type);
    }
}

let logAnalyzer;
document.addEventListener('DOMContentLoaded', () => {
    logAnalyzer = new LogAnalyzer();
    window.logAnalyzer = logAnalyzer;
});