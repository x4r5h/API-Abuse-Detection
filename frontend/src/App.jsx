import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, Activity, Lock, Unlock, TrendingUp, Clock, Eye, Database } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, timelineRes, alertsRes, blockedRes] = await Promise.all([
        fetch(`${API_BASE}/api/monitoring/stats`),
        fetch(`${API_BASE}/api/monitoring/timeline`),
        fetch(`${API_BASE}/api/monitoring/alerts`),
        fetch(`${API_BASE}/api/monitoring/blocked`)
      ]);

      setStats(await statsRes.json());
      setTimeline(await timelineRes.json());
      setAlerts(await alertsRes.json());
      setBlocked(await blockedRes.json());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = autoRefresh ? setInterval(fetchData, 5000) : null;
    return () => interval && clearInterval(interval);
  }, [autoRefresh]);

  const handleUnblock = async (identifier) => {
    try {
      await fetch(`${API_BASE}/api/monitoring/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      fetchData();
    } catch (err) {
      console.error('Error unblocking:', err);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'bg-red-500',
      HIGH: 'bg-orange-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-blue-500'
    };
    return colors[severity] || 'bg-gray-500';
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Success', value: stats.total_requests - stats.failed_requests, color: '#10b981' },
    { name: 'Failed', value: stats.failed_requests, color: '#ef4444' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-purple-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">API Sentinel</h1>
              <p className="text-purple-300">Real-time API Abuse Detection Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                autoRefresh 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/50' 
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {autoRefresh ? '● Live' : '○ Paused'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-600/50"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Activity className="w-8 h-8" />}
          title="Total Requests"
          value={stats.total_requests}
          subtitle="Last Hour"
          color="from-blue-500 to-cyan-500"
          pulse={true}
        />
        <StatCard
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Failed Requests"
          value={stats.failed_requests}
          subtitle={`${((stats.failed_requests / stats.total_requests) * 100 || 0).toFixed(1)}% failure rate`}
          color="from-red-500 to-pink-500"
        />
        <StatCard
          icon={<Eye className="w-8 h-8" />}
          title="Active Alerts"
          value={stats.active_alerts}
          subtitle="Unresolved incidents"
          color="from-orange-500 to-yellow-500"
          pulse={stats.active_alerts > 0}
        />
        <StatCard
          icon={<Lock className="w-8 h-8" />}
          title="Blocked Clients"
          value={stats.blocked_clients}
          subtitle="Currently blocked"
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Request Timeline</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="time" stroke="#a78bfa" />
              <YAxis stroke="#a78bfa" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1b4b', 
                  border: '1px solid #a78bfa',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#a78bfa" 
                strokeWidth={3}
                dot={{ fill: '#a78bfa', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Request Distribution Pie */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Request Status</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1b4b', 
                  border: '1px solid #a78bfa',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
              <p className="text-xs text-gray-300">Success</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
              <p className="text-xs text-gray-300">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Endpoints */}
      {stats.top_endpoints.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Top Endpoints</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.top_endpoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="path" stroke="#a78bfa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a78bfa" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1b4b', 
                  border: '1px solid #a78bfa',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alerts & Blocked Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-bold text-white">Recent Alerts</h2>
            <span className="ml-auto bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
              {alerts.length}
            </span>
          </div>
          <div className="overflow-y-auto max-h-96 custom-scrollbar">
            {alerts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No alerts detected</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.time}
                      </span>
                    </div>
                    <p className="text-white font-medium mb-1">{alert.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>IP: {alert.ip}</span>
                      <span>Key: {alert.api_key}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Blocked Clients */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white">Blocked Clients</h2>
            <span className="ml-auto bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
              {blocked.length}
            </span>
          </div>
          <div className="overflow-y-auto max-h-96 custom-scrollbar">
            {blocked.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No blocked clients</p>
            ) : (
              <div className="space-y-3">
                {blocked.map((client, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-mono text-sm font-medium">
                        {client.identifier}
                      </span>
                      <button
                        onClick={() => handleUnblock(client.identifier)}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-lg shadow-green-600/50"
                      >
                        <Unlock className="w-3 h-3" />
                        Unblock
                      </button>
                    </div>
                    <p className="text-red-300 text-sm mb-2">{client.reason}</p>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Blocked: {client.blocked_at}</div>
                      <div>Expires: {client.expires_at}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(167, 139, 250, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(167, 139, 250, 0.7);
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color, pulse }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-2xl transform hover:scale-105 transition-all duration-300 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold mb-1">{value.toLocaleString()}</h3>
      <p className="text-sm font-medium opacity-90">{title}</p>
      <p className="text-xs opacity-75 mt-1">{subtitle}</p>
    </div>
  );
}
