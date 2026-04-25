import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import { FaUsers, FaLightbulb, FaClipboardList, FaCheckCircle } from 'react-icons/fa';
import '../AdminDashboard/AdminDashboard.css';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.supervisorStats({ supervisor_id: user?.supervisor_id });
      setStats(data);
    } catch {
      setStats(null);
    } finally { setLoading(false); }
  };

  if (loading && !stats) {
    return <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>;
  }

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const typeChip = (type) => {
    if (type === 'clock_in') return <span className="chip chip--info">Clock In</span>;
    if (type === 'submission') return <span className="chip chip--warning">Submission</span>;
    return <span className="chip">{type}</span>;
  };

  return (
    <div className="admin-dashboard" id="supervisor-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__greeting">
          <h1 className="admin-dashboard__title">Welcome, {user?.first_name || 'Supervisor'} 👋</h1>
          <p className="admin-dashboard__subtitle">Here's your intern monitoring overview.</p>
        </div>
      </div>

      <div className="admin-dashboard__stats">
        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--primary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--primary"><FaUsers /></div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.assigned_interns ?? 0}</div>
          <div className="admin-dashboard__stat-label">Assigned Interns</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--secondary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--secondary"><FaLightbulb /></div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.active_interns ?? 0}</div>
          <div className="admin-dashboard__stat-label">Active Interns</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--warning">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--warning"><FaClipboardList /></div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.pending_submissions ?? 0}</div>
          <div className="admin-dashboard__stat-label">Submissions To Be Graded</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--success">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--success"><FaCheckCircle /></div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.graded_submissions ?? 0}</div>
          <div className="admin-dashboard__stat-label">Graded Submissions</div>
        </div>
      </div>

      <div className="admin-dashboard__activity">
        <div className="admin-dashboard__activity-header">
          <h3 className="admin-dashboard__activity-title">Recent Intern Activity</h3>
        </div>
        <table className="admin-dashboard__table">
          <thead>
            <tr>
              <th>Intern</th>
              <th>Activity</th>
              <th>Date & Time</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recent_activity || []).length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>No recent activity.</td></tr>
            ) : (
              (stats?.recent_activity || []).map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{row.intern_name}</td>
                  <td>{row.action}</td>
                  <td>{formatDateTime(row.event_time)}</td>
                  <td>{typeChip(row.type)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
