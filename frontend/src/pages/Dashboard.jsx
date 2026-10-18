import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Phone, 
  Clock, 
  DollarSign, 
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [stats, setStats] = useState({
    summary: {
      totalCalls: 0,
      completedCalls: 0,
      failedCalls: 0,
      totalDurationMinutes: 0,
      totalCost: 0.0,
      successRate: 0
    },
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const statsRes = await axios.get('http://localhost:5000/api/stats');
        setStats(statsRes.data);
        
        const callsRes = await axios.get('http://localhost:5000/api/calls');
        // Take latest 5 calls for quick view
        setRecentCalls(callsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <span className="loading-spinner" style={{ width: '40px', height: '40px' }}></span>
      </div>
    );
  }

  const { summary, chartData } = stats;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p className="subtitle">Real-time statistics on automated voice campaigns</p>
        </div>
      </div>

      {/* Stats Widget Row */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <Phone size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Outbound Calls</span>
            <span className="stat-value">{summary.totalCalls}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">{summary.successRate}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Talk Time</span>
            <span className="stat-value">{summary.totalDurationMinutes} mins</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon error">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estimated Cost</span>
            <span className="stat-value">${summary.totalCost}</span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '32px' }}>
        {/* Custom Activity Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Outbound Call Activity (7 Days)</h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', padding: '10px 0' }}>
            {chartData.map((day, idx) => {
              const maxVal = Math.max(...chartData.map(d => d.completed + d.failed), 1);
              const completedHeight = (day.completed / maxVal) * 150;
              const failedHeight = (day.failed / maxVal) * 150;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '150px', width: '12px', gap: '2px' }}>
                    {day.completed > 0 && (
                      <div style={{ height: `${completedHeight}px`, width: '100%', backgroundColor: 'var(--success)', borderRadius: '4px' }} title={`Completed: ${day.completed}`} />
                    )}
                    {day.failed > 0 && (
                      <div style={{ height: `${failedHeight}px`, width: '100%', backgroundColor: 'var(--error)', borderRadius: '4px' }} title={`Failed: ${day.failed}`} />
                    )}
                    {day.completed === 0 && day.failed === 0 && (
                      <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>{day.date}</span>
                </div>
              );
            })}
          </div>
          <div className="flex-align" style={{ gap: '20px', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span className="flex-align" style={{ gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
              Completed Call
            </span>
            <span className="flex-align" style={{ gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--error)' }}></span>
              Failed/No Answer
            </span>
          </div>
        </div>

        {/* Call Completion Ratios */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2>Connection Summary</h2>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
              <svg width="100%" height="100%" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="20" cy="20" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                <circle cx="20" cy="20" r="15.915" fill="none" stroke="var(--success)" strokeWidth="4" 
                        strokeDasharray={`${summary.successRate} ${100 - summary.successRate}`} 
                        strokeDashoffset="0" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '20px' }}>{summary.successRate}%</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Success</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="flex-between">
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Connected & Answered:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{summary.completedCalls} calls</span>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Failed / Rejected:</span>
                <span style={{ fontWeight: 600, color: 'var(--error)' }}>{summary.failedCalls} calls</span>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Dialed:</span>
                <span style={{ fontWeight: 600 }}>{summary.totalCalls} calls</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent call list */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h2>Recent Calls</h2>
          <Link to="/calls" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            View All Logs <ArrowRight size={14} />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            No outbound calls found in history. Click on Campaigns to start calling.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Agent Name</th>
                  <th>Campaign</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Cost</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{call.contactName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{call.contactPhone}</div>
                    </td>
                    <td>{call.agentName}</td>
                    <td>{call.campaignName}</td>
                    <td>{call.duration} sec</td>
                    <td>
                      <span className={`badge badge-${call.status.toLowerCase()}`}>
                        {call.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>${call.cost.toFixed(3)}</td>
                    <td style={{ color: 'var(--text-dark)' }}>
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
