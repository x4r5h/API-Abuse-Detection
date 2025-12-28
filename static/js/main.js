// main.js - Fixed Dashboard with Better Error Handling

class ToastNotification {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none';
            this.container.style.cssText = 'max-width: 400px;';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto transform transition-all duration-300 ease-out';
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            critical: '⚠'
        };

        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600',
            critical: 'bg-red-700'
        };

        const bgColor = colors[type] || colors.info;
        const icon = icons[type] || icons.info;
        
        toast.innerHTML = `
            <div class="${bgColor} text-white rounded-lg shadow-2xl flex items-start gap-3 p-4 min-w-[320px] max-w-[400px]">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xl font-bold">
                        ${icon}
                    </div>
                </div>
                <div class="flex-1 pt-0.5">
                    <p class="text-sm font-medium leading-tight">${message}</p>
                </div>
                <button onclick="this.closest('.transform').remove()" 
                        class="flex-shrink-0 text-white hover:text-gray-200 transition-colors ml-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // Initial state (off-screen)
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        
        this.container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });
        });
        
        // Play sound for critical/error
        if (type === 'critical' || type === 'error') {
            this.playNotificationSound();
        }
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }
        
        return toast;
    }

    remove(toast) {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    playNotificationSound() {
        // Create a subtle beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Audio not available');
        }
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    critical(message, duration = 8000) {
        return this.show(message, 'critical', duration);
    }
}

// Create global toast instance
window.toast = new ToastNotification();

// Update the SentinelDashboard class showNotification method
// Replace the existing showNotification method with:
/*
showNotification(message, type = 'info') {
    window.toast.show(message, type);
}
*/

// Also update error handling in loadDashboardData:
/*
async loadDashboardData() {
    try {
        // ... existing code ...
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        window.toast.error('Failed to load dashboard data. Retrying...');
        setTimeout(() => this.loadDashboardData(), 5000);
    }
}
*/

// Example usage:
// window.toast.success('Operation completed successfully!');
// window.toast.error('Failed to load data');
// window.toast.warning('Rate limit approaching');
// window.toast.info('Data refreshed');
// window.toast.critical('CRITICAL: System under attack!');


class SentinelDashboard {
    constructor() {
        this.apiBase = '/api/monitoring';
        this.charts = {};
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.initializeTypedText();
        this.initializeClock();
        
        // Initialize charts first, then load data
        setTimeout(() => {
            this.initializeCharts();
            this.loadDashboardData();
            this.startRealTimeUpdates();
            this.initializeAnimations();
        }, 100);
    }

    initializeTypedText() {
        if (typeof Typed !== 'undefined' && document.getElementById('typed-text')) {
            new Typed('#typed-text', {
                strings: [
                    'Real-time threat detection',
                    'Intelligent API monitoring',
                    'Advanced anomaly detection',
                    'Automated abuse prevention'
                ],
                typeSpeed: 50,
                backSpeed: 30,
                backDelay: 2000,
                loop: true,
                showCursor: false
            });
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
            
            const lastUpdatedElement = document.getElementById('last-updated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = 'now';
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    async loadDashboardData() {
        try {
            // Load stats
            const statsResponse = await fetch(`${this.apiBase}/stats`);
            if (!statsResponse.ok) {
                throw new Error(`Stats API returned ${statsResponse.status}`);
            }
            const statsData = await statsResponse.json();
            this.updateStats(statsData);
            
            // Update endpoints table AND chart
            if (statsData.top_endpoints && statsData.top_endpoints.length > 0) {
                this.updateEndpointsTable(statsData.top_endpoints);
                this.updateEndpointsChart(statsData.top_endpoints);  // Add this line
            } else {
                window.toast?.warning('No endpoint data available yet');
            }

            // Load timeline for traffic chart
            const timelineResponse = await fetch(`${this.apiBase}/timeline`);
            if (timelineResponse.ok) {
                const timelineData = await timelineResponse.json();
                if (timelineData && timelineData.length > 0) {
                    this.updateTrafficChart(timelineData);
                }
            }

            // Load alerts
            const alertsResponse = await fetch(`${this.apiBase}/alerts`);
            if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                this.updateAlerts(alertsData.slice(0, 5));
            }

            // Load blocked IPs
            const blockedResponse = await fetch(`${this.apiBase}/blocked`);
            if (blockedResponse.ok) {
                const blockedData = await blockedResponse.json();
                this.updateBlockedCount(blockedData.length);
            }

            // Success notification
            if (window.toast) {
                window.toast.success('Dashboard data loaded', 3000);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            if (window.toast) {
                window.toast.error('Failed to load dashboard data. Retrying...');
            }
            setTimeout(() => this.loadDashboardData(), 5000);
        }
    }

    updateEndpointsChart(endpoints) {
        if (!this.charts.endpoints || !endpoints || endpoints.length === 0) {
            console.log('Cannot update endpoints chart: chart not initialized or no data');
            return;
        }

        try {
            const data = endpoints.map(e => ({
                value: e.count,
                name: e.path
            }));

            this.charts.endpoints.setOption({
                series: [{
                    data: data
                }]
            });
            
            console.log('Endpoints chart updated with data:', data);
        } catch (error) {
            console.error('Error updating endpoints chart:', error);
        }
    }
    updateStats(data) {
        this.animateCounter('total-requests', data.total_requests || 0);
        this.animateCounter('failed-requests', data.failed_requests || 0);
        this.animateCounter('active-alerts-count', data.active_alerts || 0);
        this.animateCounter('blocked-ips-count', data.blocked_clients || 0);
        
        const activeAlertsElement = document.getElementById('active-alerts');
        if (activeAlertsElement) {
            activeAlertsElement.textContent = `${data.active_alerts || 0} Active Alerts`;
        }
        
        const blockedIpsElement = document.getElementById('blocked-ips');
        if (blockedIpsElement) {
            blockedIpsElement.textContent = `${data.blocked_clients || 0} IPs Blocked`;
        }
    }

    updateBlockedCount(count) {
        this.animateCounter('blocked-ips-count', count);
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        
        if (typeof anime !== 'undefined') {
            anime({
                targets: { value: startValue },
                value: targetValue,
                duration: 2000,
                easing: 'easeOutExpo',
                update: function(anim) {
                    element.textContent = Math.round(anim.animatables[0].target.value).toLocaleString();
                }
            });
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    }

    updateAlerts(alerts) {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">No alerts</div>';
            return;
        }

        container.innerHTML = alerts.map(alert => {
            const timeAgo = this.getTimeAgo(alert.timestamp * 1000);
            const severityClass = alert.severity.toLowerCase();
            
            return `
                <div class="alert-card alert-${severityClass} p-4 rounded-lg cursor-pointer" onclick="window.location.href='/alerts'">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="text-xs font-medium px-2 py-1 rounded ${this.getSeverityBadgeClass(alert.severity)}">${alert.severity}</span>
                                <span class="text-xs text-gray-400">${timeAgo}</span>
                            </div>
                            <p class="text-sm font-medium text-gray-100">${alert.reason}</p>
                            <p class="text-xs text-gray-400 mt-1">IP: ${alert.ip}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

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

    updateEndpointsTable(endpoints) {
        const container = document.getElementById('endpoints-table');
        if (!container || !endpoints || endpoints.length === 0) return;

        const maxCount = endpoints[0].count;

        container.innerHTML = endpoints.map((endpoint) => `
            <div class="endpoint-row flex items-center justify-between p-3 rounded-lg">
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-100">${endpoint.path}</p>
                    <p class="text-xs text-gray-400">${endpoint.count.toLocaleString()} requests</p>
                </div>
                <div class="text-right">
                    <div class="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style="width: ${Math.min(100, (endpoint.count / maxCount) * 100)}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    initializeCharts() {
        this.initTrafficChart();
        this.initEndpointsChart();
    }

    initTrafficChart() {
        const chartElement = document.getElementById('traffic-chart');
        if (!chartElement || typeof echarts === 'undefined') {
            console.warn('Traffic chart element or echarts not available');
            return;
        }

        try {
            this.charts.traffic = echarts.init(chartElement);
            
            const option = {
                backgroundColor: 'transparent',
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: [],
                    axisLine: { lineStyle: { color: '#374151' } },
                    axisLabel: { color: '#9CA3AF' }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { lineStyle: { color: '#374151' } },
                    axisLabel: { color: '#9CA3AF' },
                    splitLine: { lineStyle: { color: '#374151' } }
                },
                series: [
                    {
                        name: 'Requests',
                        type: 'line',
                        data: [],
                        smooth: true,
                        lineStyle: { color: '#3742fa', width: 3 },
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [
                                    { offset: 0, color: 'rgba(55, 66, 250, 0.3)' },
                                    { offset: 1, color: 'rgba(55, 66, 250, 0.05)' }
                                ]
                            }
                        },
                        symbol: 'circle',
                        symbolSize: 6,
                        itemStyle: { color: '#3742fa' }
                    }
                ],
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    borderColor: '#374151',
                    textStyle: { color: '#F1F2F6' }
                }
            };

            this.charts.traffic.setOption(option);
        } catch (error) {
            console.error('Error initializing traffic chart:', error);
        }
    }

    updateTrafficChart(timelineData) {
        if (!this.charts.traffic || !timelineData || timelineData.length === 0) {
            console.log('Cannot update traffic chart: chart not initialized or no data');
            return;
        }

        try {
            const labels = timelineData.map(item => item.time);
            const data = timelineData.map(item => item.requests);

            this.charts.traffic.setOption({
                xAxis: { data: labels },
                series: [{ data: data }]
            });
        } catch (error) {
            console.error('Error updating traffic chart:', error);
        }
    }

    initEndpointsChart() {
        const chartElement = document.getElementById('endpoints-chart');
        if (!chartElement || typeof echarts === 'undefined') return;

        try {
            this.charts.endpoints = echarts.init(chartElement);
            
            const option = {
                backgroundColor: 'transparent',
                series: [
                    {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        center: ['50%', '50%'],
                        data: [],
                        itemStyle: {
                            borderRadius: 8,
                            borderColor: '#1a1a1a',
                            borderWidth: 2
                        },
                        label: {
                            color: '#F1F2F6',
                            fontSize: 12
                        },
                        labelLine: {
                            lineStyle: { color: '#374151' }
                        },
                        color: ['#3742fa', '#2ed573', '#ffa502', '#ff4757']
                    }
                ],
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    borderColor: '#374151',
                    textStyle: { color: '#F1F2F6' },
                    formatter: '{b}: {c} requests ({d}%)'
                }
            };

            this.charts.endpoints.setOption(option);
        } catch (error) {
            console.error('Error initializing endpoints chart:', error);
        }
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    getSeverityBadgeClass(severity) {
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'bg-red-600 text-white';
            case 'HIGH': return 'bg-red-500 text-white';
            case 'MEDIUM': return 'bg-yellow-500 text-white';
            case 'LOW': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.loadDashboardData();
            this.updateLastUpdated();
        }, 10000);
    }

    updateLastUpdated() {
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = 'now';
        }
    }

    initializeAnimations() {
        if (typeof anime === 'undefined') return;
        
        anime({
            targets: '.metric-card',
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 800,
            delay: anime.stagger(100),
            easing: 'easeOutExpo'
        });

        anime({
            targets: '.chart-container',
            opacity: [0, 1],
            duration: 1000,
            delay: 400,
            easing: 'easeOutExpo'
        });
    }

    showNotification(message, type = 'info') {
        if (window.toast) {
            window.toast.show(message, type);
        }
    }

    // showNotification(message, type = 'info') {
    //     const notification = document.createElement('div');
    //     notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
    //         type === 'success' ? 'bg-green-600' : 
    //         type === 'error' ? 'bg-red-600' : 
    //         'bg-blue-600'
    //     } text-white`;
    //     notification.textContent = message;
        
    //     document.body.appendChild(notification);
        
    //     if (typeof anime !== 'undefined') {
    //         anime({
    //             targets: notification,
    //             translateX: [300, 0],
    //             opacity: [0, 1],
    //             duration: 300,
    //             easing: 'easeOutExpo'
    //         });
    //     }
        
    //     setTimeout(() => {
    //         if (typeof anime !== 'undefined') {
    //             anime({
    //                 targets: notification,
    //                 translateX: [0, 300],
    //                 opacity: [1, 0],
    //                 duration: 300,
    //                 easing: 'easeInExpo',
    //                 complete: () => document.body.removeChild(notification)
    //             });
    //         } else {
    //             document.body.removeChild(notification);
    //         }
    //     }, 3000);
    // }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.dispose) {
                chart.dispose();
            }
        });
    }
}

function refreshDashboard() {
    if (window.dashboard) {
        window.dashboard.loadDashboardData();
        
        const button = event.target.closest('button');
        if (button) {
            const icon = button.querySelector('svg');
            if (icon && typeof anime !== 'undefined') {
                anime({
                    targets: icon,
                    rotate: 360,
                    duration: 1000,
                    easing: 'easeInOutQuad'
                });
            }
        }
    }
}

async function blockIP(ip) {
    if (confirm(`Are you sure you want to block IP ${ip}?`)) {
        try {
            const response = await fetch('/api/monitoring/block-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, reason: 'Blocked from dashboard', duration: 3600 })
            });

            if (response.ok) {
                showNotification(`IP ${ip} has been blocked`, 'success');
                if (window.dashboard) {
                    setTimeout(() => window.dashboard.loadDashboardData(), 1000);
                }
            } else {
                throw new Error('Failed to block IP');
            }
        } catch (error) {
            console.error('Error blocking IP:', error);
            showNotification('Failed to block IP', 'error');
        }
    }
}

function investigateIP(ip) {
    window.location.href = `/ip-management?ip=${ip}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        'bg-blue-600'
    } text-white`;
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

document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new SentinelDashboard();
});

window.addEventListener('resize', function() {
    if (window.dashboard && window.dashboard.charts) {
        Object.values(window.dashboard.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
});

window.addEventListener('beforeunload', function() {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});