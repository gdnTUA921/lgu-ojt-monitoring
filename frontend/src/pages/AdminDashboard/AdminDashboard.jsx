import { useState, useEffect } from 'react';
import { dashboardApi } from '../../services/api';
import { FaUsers, FaBuilding, FaClipboardList, FaClock, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.adminStats();
      setStats(data);
    } catch {
      // Demo data
      setStats({
        total_interns: 124,
        total_supervisors: 18,
        total_departments: 12,
        pending_documents: 45,
        recent_activity: [
          { id: 1, type: 'registration', message: 'New intern Maria Santos registered', date: '2026-04-02', status: 'success' },
          { id: 2, type: 'document', message: 'MOA submitted by Juan Dela Cruz', date: '2026-04-01', status: 'warning' },
          { id: 3, type: 'evaluation', message: 'Final evaluation for Ana Reyes completed', date: '2026-03-31', status: 'info' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span>Loading dashboard data…</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" id="admin-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__greeting">
          <h1 className="admin-dashboard__title">Dashboard Overview</h1>
          <p className="admin-dashboard__subtitle">Monitor the status of OJT programs across all departments.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="admin-dashboard__stats">
        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--primary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--primary">
              <FaUsers />
            </div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.total_interns ?? 0}</div>
          <div className="admin-dashboard__stat-label">Total Interns</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--secondary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--secondary">
              <FaUsers />
            </div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.total_supervisors ?? 0}</div>
          <div className="admin-dashboard__stat-label">Total Supervisors</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--warning">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--warning">
              <FaBuilding />
            </div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.total_departments ?? 0}</div>
          <div className="admin-dashboard__stat-label">Departments</div>
        </div>

        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--success">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--success">
              <FaClipboardList />
            </div>
          </div>
          <div className="admin-dashboard__stat-value">{stats?.pending_documents ?? 0}</div>
          <div className="admin-dashboard__stat-label">Pending Docs</div>
        </div>
      </div>

      <div className="admin-dashboard__activity">
        <div className="admin-dashboard__activity-header">
          <h3 className="admin-dashboard__activity-title">Recent System Activity</h3>
        </div>
        <table className="admin-dashboard__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Performer</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recent_activity || []).map((row, idx) => (
              <tr key={idx}>
                <td>{row.date}</td>
                <td>{row.event}</td>
                <td>
                  <div style={{ fontWeight: '500' }}>{row.first_name ? `${row.first_name} ${row.last_name}` : 'System'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{row.performer_email}</div>
                </td>
                <td>{row.details}</td>
                <td>{row.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
