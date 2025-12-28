// Enhanced alerts.js with Correlated Incidents & Better Notifications

class AlertManager {
    constructor() {
        this.alerts = [];
        this.incidents = [];
        this.selectedAlert = null;
        this.autoRefreshInterval = null;
        this.filters = {
            severity: 'all',
            status: 'active',
            search: ''
        };
        this.init();
    }

    init() {
        this.initializeClock();
        this.setupEventListeners();
        this.loadAlerts();
        this.loadCorrelatedIncidents();
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
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', (e) => {
                this.filters.severity = e.target.value;
                this.filterAlerts();
            });
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.filterAlerts();
            });
        }

        const alertSearch = document.getElementById('alert-search');
        if (alertSearch) {
            alertSearch.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.filterAlerts();
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

        const exportBtn = document.getElementById('export-alerts');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAlerts();
            });
        }
    }

    async loadAlerts() {
        try {
            const response = await fetch('/api/monitoring/alerts');
            if (response.ok) {
                const alertsData = await response.json();
                this.alerts = alertsData.map(alert => ({
                    id: alert.id,
                    ip: alert.ip,
                    apiKey: alert.api_key,
                    reason: alert.reason,
                    severity: alert.severity,
                    timestamp: alert.timestamp * 1000,
                    resolved: alert.resolved,
                    correlationId: alert.correlation_id,
                    details: {
                        requestCount: Math.floor(Math.random() * 1000) + 50,
                        failedRequests: Math.floor(Math.random() * 50),
                        userAgent: 'Unknown',
                        location: { country: 'Unknown', city: 'Unknown' }
                    }
                }));

                this.renderAlerts();
                this.renderTimeline();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.showToast('Failed to load alerts', 'error');
        }
    }

    async loadCorrelatedIncidents() {
        try {
            const response = await fetch('/api/monitoring/correlated-incidents');
            if (response.ok) {
                this.incidents = await response.json();
                this.renderCorrelatedIncidents();
            }
        } catch (error) {
            console.error('Error loading incidents:', error);
        }
    }

    renderCorrelatedIncidents() {
        const container = document.getElementById('correlated-incidents');
        if (!container) return;

        if (!this.incidents || this.incidents.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">No correlated incidents found</div>';
            return;
        }

        const html = this.incidents.map(incident => `
            <div class="incident-flow p-4 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-gray-100">Incident #${incident.id.split('_')[2] || incident.id.slice(-4)}</h4>
                    <span class="text-xs px-2 py-1 bg-purple-600 text-white rounded">${incident.alert_count} alerts</span>
                </div>
                <p class="text-sm text-gray-400 mb-3">${incident.description}</p>
                <div class="space-y-2">
                    ${incident.alerts.map(alert => `
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-300">${alert.reason}</span>
                            <span class="text-gray-400 font-mono">${alert.ip}</span>
                        </div>
                    `).join('')}
                    ${incident.has_more ? `<div class="text-xs text-gray-500">+${incident.alert_count - 3} more alerts</div>` : ''}
                </div>
                <div class="correlation-line mt-3"></div>
                <div class="flex items-center justify-between mt-3">
                    <span class="text-xs text-gray-400">Last activity: ${this.getTimeAgo(incident.last_activity * 1000)}</span>
                    <button onclick="alertManager.investigateIncident('${incident.id}')" 
                            class="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Investigate</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    investigateIncident(correlationId) {
        this.showToast(`Investigating incident ${correlationId}...`, 'info');
        // Filter alerts by correlation ID
        this.filters.search = '';
        document.getElementById('alert-search').value = '';
        this.filterAlerts();
    }

    filterAlerts() {
        this.renderAlerts();
        this.updateStatistics();
        this.updateActiveFilters();
    }

    getFilteredAlerts() {
        return this.alerts.filter(alert => {
            if (this.filters.severity !== 'all' && 
                alert.severity.toLowerCase() !== this.filters.severity) {
                return false;
            }
            
            if (this.filters.status === 'active' && alert.resolved) {
                return false;
            }
            if (this.filters.status === 'resolved' && !alert.resolved) {
                return false;
            }
            
            if (this.filters.search && 
                !alert.reason.toLowerCase().includes(this.filters.search) &&
                !alert.ip.includes(this.filters.search) &&
                !alert.apiKey.toLowerCase().includes(this.filters.search)) {
                return false;
            }
            
            return true;
        });
    }

    renderAlerts() {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const filteredAlerts = this.getFilteredAlerts();
        
        if (filteredAlerts.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">No alerts found</div>';
            return;
        }

        const html = filteredAlerts.map(alert => {
            const timeAgo = this.getTimeAgo(alert.timestamp);
            const severityClass = `alert-${alert.severity.toLowerCase()}`;
            const severityBadge = `severity-${alert.severity.toLowerCase()}`;
            
            return `
                <div class="alert-card ${severityClass} p-4 rounded-lg cursor-pointer ${alert.resolved ? 'alert-resolved' : ''}" 
                     onclick="alertManager.selectAlert(${alert.id})">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="severity-badge ${severityBadge}">${alert.severity}</span>
                                <span class="text-xs text-gray-400 font-mono">${timeAgo}</span>
                                ${alert.resolved ? '<span class="text-xs px-2 py-1 bg-green-600 text-white rounded">RESOLVED</span>' : ''}
                                ${alert.correlationId ? '<span class="text-xs px-2 py-1 bg-purple-600 text-white rounded">CORRELATED</span>' : ''}
                            </div>
                            <p class="text-sm font-medium text-gray-100 mb-1">${alert.reason}</p>
                            <div class="flex items-center space-x-4 text-xs text-gray-400">
                                <span class="font-mono">IP: ${alert.ip}</span>
                                <span class="font-mono">API: ${alert.apiKey}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${!alert.resolved ? `
                                <button onclick="event.stopPropagation(); alertManager.resolveAlert(${alert.id})" 
                                        class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Resolve</button>
                                <button onclick="event.stopPropagation(); alertManager.blockIP('${alert.ip}')" 
                                        class="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Block</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.alert-card',
                translateX: [-20, 0],
                opacity: [0, 1],
                duration: 600,
                delay: anime.stagger(100),
                easing: 'easeOutExpo'
            });
        }
    }

    selectAlert(alertId) {
        this.selectedAlert = this.alerts.find(a => a.id === alertId);
        this.renderAlertDetails();
        
        document.querySelectorAll('.alert-card').forEach(card => {
            card.classList.remove('ring-2', 'ring-blue-500');
        });
        event.target.closest('.alert-card').classList.add('ring-2', 'ring-blue-500');
    }

    renderAlertDetails() {
        if (!this.selectedAlert) return;

        const container = document.getElementById('alert-details');
        if (!container) return;
        
        const alert = this.selectedAlert;
        
        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-lg font-semibold text-gray-100">Alert #${alert.id}</h4>
                    <span class="severity-badge severity-${alert.severity.toLowerCase()}">${alert.severity}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <label class="block text-gray-400 mb-1">Timestamp</label>
                        <p class="text-gray-100">${new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                        <label class="block text-gray-400 mb-1">IP Address</label>
                        <p class="text-gray-100 font-mono">${alert.ip}</p>
                    </div>
                    <div>
                        <label class="block text-gray-400 mb-1">API Key</label>
                        <p class="text-gray-100 font-mono">${alert.apiKey}</p>
                    </div>
                    <div>
                        <label class="block text-gray-400 mb-1">Status</label>
                        <p class="text-gray-100">${alert.resolved ? 'Resolved' : 'Active'}</p>
                    </div>
                    ${alert.correlationId ? `
                    <div class="col-span-2">
                        <label class="block text-gray-400 mb-1">Correlation ID</label>
                        <p class="text-gray-100 font-mono text-xs">${alert.correlationId}</p>
                    </div>
                    ` : ''}
                </div>
                
                <div>
                    <label class="block text-gray-400 mb-1">Reason</label>
                    <p class="text-gray-100">${alert.reason}</p>
                </div>
                
                <div class="pt-4 border-t border-gray-700">
                    <h5 class="text-sm font-medium text-gray-300 mb-2">Recommended Actions</h5>
                    <div class="space-y-2">
                        ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? `
                            <div class="text-sm text-red-400">• Immediate IP blocking recommended</div>
                            <div class="text-sm text-yellow-400">• Monitor for similar patterns</div>
                        ` : `
                            <div class="text-sm text-blue-400">• Continue monitoring</div>
                            <div class="text-sm text-gray-400">• Check related logs</div>
                        `}
                        <div class="text-sm text-gray-400">• Review access patterns</div>
                    </div>
                </div>
                
                ${!alert.resolved ? `
                    <div class="flex space-x-2 pt-4">
                        <button onclick="alertManager.resolveAlert(${alert.id})" 
                                class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Mark Resolved</button>
                        <button onclick="alertManager.blockIP('${alert.ip}')" 
                                class="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Block IP</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTimeline() {
        const container = document.getElementById('alert-timeline');
        if (!container) return;
        
        const recentAlerts = this.alerts.slice(0, 10);
        
        const html = recentAlerts.map(alert => {
            const timeAgo = this.getTimeAgo(alert.timestamp);
            const dotColor = this.getSeverityColor(alert.severity);
            
            return `
                <div class="timeline-item">
                    <div class="timeline-dot" style="background-color: ${dotColor}"></div>
                    <div class="text-sm">
                        <p class="font-medium text-gray-100">${alert.reason}</p>
                        <p class="text-xs text-gray-400">${timeAgo} • ${alert.ip}</p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async resolveAlert(alertId) {
        try {
            const response = await fetch(`/api/monitoring/alert/${alertId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const alert = this.alerts.find(a => a.id === alertId);
                if (alert) {
                    alert.resolved = true;
                    this.renderAlerts();
                    this.updateStatistics();
                    this.showToast(`Alert #${alertId} resolved and IP unblocked`, 'success');
                    
                    if (this.selectedAlert && this.selectedAlert.id === alertId) {
                        this.renderAlertDetails();
                    }
                }
            } else {
                throw new Error('Failed to resolve alert');
            }
        } catch (error) {
            console.error('Error resolving alert:', error);
            this.showToast('Failed to resolve alert', 'error');
        }
    }

    async blockIP(ip) {
        if (!confirm(`Are you sure you want to block IP ${ip}?`)) return;

        try {
            const response = await fetch('/api/monitoring/block-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, reason: 'Blocked from alerts', duration: 3600 })
            });

            if (response.ok) {
                this.showToast(`IP ${ip} has been blocked`, 'success');
            } else {
                throw new Error('Failed to block IP');
            }
        } catch (error) {
            console.error('Error blocking IP:', error);
            this.showToast('Failed to block IP', 'error');
        }
    }

    updateStatistics() {
        const filteredAlerts = this.getFilteredAlerts();
        const critical = filteredAlerts.filter(a => a.severity === 'CRITICAL').length;
        const high = filteredAlerts.filter(a => a.severity === 'HIGH').length;
        const medium = filteredAlerts.filter(a => a.severity === 'MEDIUM').length;
        
        const criticalEl = document.getElementById('critical-count');
        if (criticalEl) criticalEl.textContent = critical;

        const highEl = document.getElementById('high-count');
        if (highEl) highEl.textContent = high;

        const mediumEl = document.getElementById('medium-count');
        if (mediumEl) mediumEl.textContent = medium;
    }

    updateActiveFilters() {
        const container = document.getElementById('active-filters');
        if (!container) return;
        
        const filters = [];
        
        if (this.filters.severity !== 'all') {
            filters.push(`Severity: ${this.filters.severity}`);
        }
        if (this.filters.status !== 'active') {
            filters.push(`Status: ${this.filters.status}`);
        }
        if (this.filters.search) {
            filters.push(`Search: ${this.filters.search}`);
        }
        
        container.innerHTML = filters.length > 0 ? filters.map(filter => `
            <span class="filter-chip text-xs px-2 py-1 rounded-full">${filter}</span>
        `).join('') : '';
    }

    exportAlerts() {
        const filteredAlerts = this.getFilteredAlerts();
        const csvContent = this.generateCSV(filteredAlerts);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alerts_${new Date().toISOString()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showToast(`Exported ${filteredAlerts.length} alerts`, 'success');
    }

    generateCSV(alerts) {
        const headers = ['ID', 'Timestamp', 'IP', 'API Key', 'Severity', 'Reason', 'Status', 'Correlation ID'];
        const rows = alerts.map(alert => [
            alert.id,
            new Date(alert.timestamp).toISOString(),
            alert.ip,
            alert.apiKey,
            alert.severity,
            alert.reason,
            alert.resolved ? 'Resolved' : 'Active',
            alert.correlationId || 'N/A'
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            this.loadAlerts();
            this.loadCorrelatedIncidents();
        }, 15000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    getSeverityColor(severity) {
        const colors = {
            'CRITICAL': '#ff4757',
            'HIGH': '#ff3742',
            'MEDIUM': '#ffa502',
            'LOW': '#3742fa'
        };
        return colors[severity] || '#3742fa';
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

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-20 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        const bgColor = {
            'success': 'bg-green-600',
            'error': 'bg-red-600',
            'warning': 'bg-yellow-600',
            'info': 'bg-blue-600'
        }[type] || 'bg-blue-600';
        
        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`;
        
        const icon = {
            'success': '✓',
            'error': '✕',
            'warning': '⚠',
            'info': 'ℹ'
        }[type] || 'ℹ';
        
        toast.innerHTML = `
            <span class="text-xl font-bold">${icon}</span>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">✕</button>
        `;
        
        toastContainer.appendChild(toast);
        
        if (typeof anime !== 'undefined') {
            anime({
                targets: toast,
                translateX: [300, 0],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutExpo'
            });
        }
        
        setTimeout(() => {
            if (typeof anime !== 'undefined') {
                anime({
                    targets: toast,
                    translateX: [0, 300],
                    opacity: [1, 0],
                    duration: 300,
                    easing: 'easeInExpo',
                    complete: () => toast.remove()
                });
            } else {
                toast.remove();
            }
        }, 5000);
    }
}

let alertManager;
document.addEventListener('DOMContentLoaded', function() {
    alertManager = new AlertManager();
    window.alertManager = alertManager;
});