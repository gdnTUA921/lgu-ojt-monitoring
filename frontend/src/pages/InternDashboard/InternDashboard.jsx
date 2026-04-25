import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import { FaClock, FaFileAlt, FaClipboardCheck, FaEye } from 'react-icons/fa';
import LocationMap from '../../components/LocationMap';
import '../AdminDashboard/AdminDashboard.css';
import './InternDashboard.css';

function TimelogModal({ log, onClose }) {
  if (!log) return null;

  const hasClockIn = log.time_in_latitude && log.time_in_longitude;
  const hasClockOut = log.time_out_latitude && log.time_out_longitude;

  return (
    <div className="intern-dashboard__modal-overlay" onClick={onClose}>
      <div className="intern-dashboard__modal" onClick={(e) => e.stopPropagation()}>
        <div className="intern-dashboard__modal-header">
          <h3>Timelog Details</h3>
          <button className="intern-dashboard__modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="intern-dashboard__modal-body">
          <div className="intern-dashboard__modal-grid">
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Date</span>
              <span className="intern-dashboard__modal-value">{log.date}</span>
            </div>
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Time In</span>
              <span className="intern-dashboard__modal-value">{log.time_in || '—'}</span>
            </div>
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Time Out</span>
              <span className="intern-dashboard__modal-value">{log.time_out || '—'}</span>
            </div>
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Total Hours</span>
              <span className="intern-dashboard__modal-value">{log.total_hours ?? '0'}h</span>
            </div>
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Overtime</span>
              <span className="intern-dashboard__modal-value">{log.overtime_hours ?? '0'}h</span>
            </div>
          </div>

          {hasClockIn && (
            <div className="intern-dashboard__modal-section">
              <h4>
                <span className="intern-dashboard__map-pin-icon clock-in">Clock In</span>
              </h4>
              <div className="intern-dashboard__modal-coords">
                <span>Lat: {log.time_in_latitude}</span>
                <span>Lng: {log.time_in_longitude}</span>
              </div>
              <LocationMap
                lat={log.time_in_latitude}
                lng={log.time_in_longitude}
                label="Clock In"
                height={240}
              />
            </div>
          )}

          {hasClockOut && (
            <div className="intern-dashboard__modal-section">
              <h4>
                <span className="intern-dashboard__map-pin-icon clock-out">Clock Out</span>
              </h4>
              <div className="intern-dashboard__modal-coords">
                <span>Lat: {log.time_out_latitude}</span>
                <span>Lng: {log.time_out_longitude}</span>
              </div>
              <LocationMap
                lat={log.time_out_latitude}
                lng={log.time_out_longitude}
                label="Clock Out"
                height={240}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InternDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const handleViewLog = useCallback(async (log) => {
    if (log.timelog_id) {
      try {
        const { timelogsApi } = await import('../../services/api');
        const res = await timelogsApi.get(log.timelog_id);
        setSelectedLog(res.timelog);
      } catch {
        setSelectedLog(log);
      }
    } else {
      setSelectedLog(log);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.internStats();
      setData(result);
    } catch {
      setData({
        intern: {
          first_name: user?.first_name || 'Intern',
          required_hours: 500,
          completed_hours: 320,
          status: 'incomplete',
        },
        requirements_submitted: { submitted: 3, total: 5 },
        reports_submitted: 2,
        recent_timelogs: [
          { date: '2026-04-10', time_in: '08:00:00', time_out: '17:00:00', total_hours: 8 },
          { date: '2026-04-09', time_in: '08:30:00', time_out: '17:30:00', total_hours: 8 },
          { date: '2026-04-08', time_in: '09:00:00', time_out: '18:00:00', total_hours: 8 },
        ],
      });
    } finally { setLoading(false); }
  };

  if (loading && !data) {
    return <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>;
  }

  const intern = data?.intern || {};
  const pct = intern.required_hours > 0
    ? Math.min(100, Math.round((intern.completed_hours / intern.required_hours) * 100))
    : 0;
  const fullName = [intern.first_name, intern.middle_name, intern.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || user?.first_name || 'Intern';

  return (
    <div className="admin-dashboard intern-dashboard" id="intern-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__greeting">
          <h1 className="admin-dashboard__title">Hello, {fullName} 👋</h1>
          <p className="admin-dashboard__subtitle">Track your internship progress here.</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="intern-dashboard__progress card" id="progress-tracker">
        <div className="overline" style={{ marginBottom: 'var(--space-4)' }}>Internship Progress</div>
        <div className="intern-dashboard__progress-ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-surface-container-high)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)'}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="60" y="56" textAnchor="middle" style={{ fontSize: '1.5rem', fontWeight: 700, fill: 'var(--color-on-surface)' }}>{pct}%</text>
            <text x="60" y="74" textAnchor="middle" style={{ fontSize: '0.65rem', fill: 'var(--color-on-surface-variant)' }}>complete</text>
          </svg>
        </div>
        <div className="intern-dashboard__progress-details">
          <div><strong>{intern.completed_hours ?? 0}</strong> / {intern.required_hours ?? 0} hours rendered</div>
          <div>Status: <span className={`chip chip--${intern.status === 'complete' ? 'success' : 'warning'}`}>{intern.status}</span></div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-dashboard__stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--primary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--primary"><FaClock /></div>
          </div>
          <div className="admin-dashboard__stat-value">{intern.completed_hours ?? 0}h</div>
          <div className="admin-dashboard__stat-label">Hours Rendered</div>
        </div>
        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--secondary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--secondary"><FaFileAlt /></div>
          </div>
          <div className="admin-dashboard__stat-value">
            {data?.requirements_submitted?.submitted ?? 0}/{data?.requirements_submitted?.total ?? 0}
          </div>
          <div className="admin-dashboard__stat-label">Requirements Submitted</div>
        </div>
        <div className="admin-dashboard__stat-card admin-dashboard__stat-card--tertiary">
          <div className="admin-dashboard__stat-header">
            <div className="admin-dashboard__stat-icon admin-dashboard__stat-icon--tertiary"><FaClipboardCheck /></div>
          </div>
          <div className="admin-dashboard__stat-value">{data?.reports_submitted ?? 0}</div>
          <div className="admin-dashboard__stat-label">Reports / Activities Submitted</div>
        </div>
      </div>

      {/* Recent Time Logs */}
      <div className="admin-dashboard__activity">
        <div className="admin-dashboard__activity-header">
          <h3 className="admin-dashboard__activity-title">Recent Time Logs</h3>
        </div>
        <table className="admin-dashboard__table">
          <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Overtime</th><th>Actions</th></tr></thead>
          <tbody>
            {(data?.recent_timelogs || []).map((log, i) => (
              <tr key={log.timelog_id || i}>
                <td>{log.date}</td>
                <td>{log.time_in}</td>
                <td>{log.time_out}</td>
                <td>{log.total_hours}h</td>
                <td style={{ color: Number(log.overtime_hours) > 0 ? 'var(--color-primary)' : 'inherit', fontWeight: Number(log.overtime_hours) > 0 ? '600' : 'normal' }}>
                  {log.overtime_hours || '0'}h
                </td>
                <td>
                  <button className="manage-page__action-btn" title="View Details" onClick={() => handleViewLog(log)}>
                    <FaEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLog && <TimelogModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
