import { useState, useEffect, useCallback } from 'react';
import { timelogsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaClock, FaEye, FaSignOutAlt } from 'react-icons/fa';
import LocationMap from '../../components/LocationMap';
import '../../styles/manage-page.css';
import '../../pages/InternDashboard/InternDashboard.css';

/* ── Timelog Detail Modal ──────────────────────────── */
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
              <span className="intern-dashboard__modal-value">{formatTime(log.time_in) || '—'}</span>
            </div>
            <div className="intern-dashboard__modal-field">
              <span className="intern-dashboard__modal-label">Time Out</span>
              <span className="intern-dashboard__modal-value">{formatTime(log.time_out) || '—'}</span>
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

/* ── Clock Status Card ─────────────────────────────── */
function ClockStatusCard({ onClockAction }) {
  const [clockState, setClockState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchClockStatus(); }, []);

  const fetchClockStatus = async () => {
    try {
      const data = await timelogsApi.clockStatus();
      setClockState(data);
    } catch {
      setClockState({ clocked_in: false, current_log: null });
    } finally {
      setLoading(false);
    }
  };

  const handleClock = async () => {
    setActionLoading(true);
    setError('');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const { latitude, longitude } = position.coords;

      if (clockState.clocked_in) {
        await timelogsApi.clockOut({ latitude, longitude });
      } else {
        await timelogsApi.clockIn({ latitude, longitude });
      }

      await fetchClockStatus();
      if (onClockAction) onClockAction();
    } catch (err) {
      if (err.code === 1) {
        setError('Location access denied. Please enable location services.');
      } else {
        setError(err.message || 'Failed to process clock action.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="manage-page__clock-card" style={{ justifyContent: 'center' }}><div className="spinner" /></div>;

  const isClockedIn = clockState?.clocked_in;
  const timeIn = clockState?.current_log?.time_in;

  return (
    <div className="manage-page__clock-card">
      <div className="manage-page__clock-status">
        <div className={`manage-page__clock-dot ${isClockedIn ? 'active' : ''}`} />
        <div>
          <div className="manage-page__clock-label">{isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}</div>
          {isClockedIn && timeIn && (
            <div className="manage-page__clock-time">Since {formatTime(timeIn)}</div>
          )}
        </div>
      </div>
      {error && <div className="manage-page__clock-error">{error}</div>}
      <button
        className={`btn ${isClockedIn ? 'btn--danger' : 'btn--primary'}`}
        onClick={handleClock}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <><span className="spinner spinner--sm" /> Processing…</>
        ) : isClockedIn ? (
          <><FaSignOutAlt /> Clock Out</>
        ) : (
          <><FaClock /> Clock In</>
        )}
      </button>
    </div>
  );
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

/* ── Main Page ─────────────────────────────────────── */
export default function TimeLogs({ mode = 'admin' }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('desc');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total_items: 0 });
  const [selectedLog, setSelectedLog] = useState(null);
  const [disputeLog, setDisputeLog] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => { fetchLogs(); }, [sort, filterDate, currentPage]);

  const handleViewLog = useCallback(async (log) => {
    try {
      const res = await timelogsApi.get(log.timelog_id);
      setSelectedLog(res.timelog);
    } catch {
      setSelectedLog(log);
    }
  }, []);

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setDisputeLoading(true);
    try {
      await timelogsApi.dispute(disputeLog.timelog_id, { is_disputed: true, dispute_reason: disputeReason.trim() });
      setDisputeLog(null);
      setDisputeReason('');
      fetchLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleUndispute = async (log) => {
    if (!confirm(`Restore the time log for ${log.date}? It will count toward rendered hours again.`)) return;
    try {
      await timelogsApi.dispute(log.timelog_id, { is_disputed: false, dispute_reason: '' });
      fetchLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        sort: sort,
        date_from: filterDate || undefined,
        page: currentPage,
        limit: 10
      };
      if (mode === 'intern') params.user_id = user?.user_id;
      const data = await timelogsApi.list(params);
      setLogs(data.timelogs || []);
      setPagination(data.pagination || { total_pages: 1, total_items: 0 });
    } catch {
      setLogs([
        { timelog_id: 1, intern_name: 'Maria Santos', date: '2026-04-02', time_in: '08:00', time_out: '17:00', total_hours: 8, overtime_hours: 0 },
        { timelog_id: 2, intern_name: 'Juan Dela Cruz', date: '2026-04-02', time_in: '08:30', time_out: null, total_hours: null, overtime_hours: 0 },
      ]);
    } finally { setLoading(false); }
  };

  return (
    <div className="manage-page" id="timelogs-page">
      <div className="manage-page__header">
        <h2 className="manage-page__title">Time Logs</h2>
      </div>

      {mode === 'intern' && (
        <ClockStatusCard onClockAction={() => fetchLogs()} />
      )}

      <div className="manage-page__filters">
        <select className="manage-page__filter-select" value={sort} onChange={e => { setSort(e.target.value); setCurrentPage(1); }}>
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <input className="input" type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} style={{ maxWidth: '200px' }} />
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr>
              {mode !== 'intern' && <th>Intern</th>}
              <th>Date</th>
              <th>In</th>
              <th>Out</th>
              <th>Overtime</th>
              <th>Total Hours</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const disputed = Number(log.is_disputed) === 1;
              return (
                <tr key={log.timelog_id} style={{ background: disputed ? 'var(--color-error-container, #fff0f0)' : undefined }}>
                  {mode !== 'intern' && <td><strong>{log.intern_name}</strong></td>}
                  <td>
                    <div>{log.date}</div>
                    {disputed && <div style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 700 }}>DISPUTED</div>}
                  </td>
                  <td>{formatTime(log.time_in) || '—'}</td>
                  <td>{formatTime(log.time_out) || 'In progress'}</td>
                  <td style={{ color: Number(log.overtime_hours) > 0 ? 'var(--color-primary)' : 'inherit', fontWeight: Number(log.overtime_hours) > 0 ? '600' : 'normal' }}>
                    {log.overtime_hours || '0'} hrs
                  </td>
                  <td style={{ textDecoration: disputed ? 'line-through' : 'none' }}>{log.total_hours || '0'} hrs</td>
                  <td>
                    <div className="manage-page__table-actions">
                      <button className="manage-page__action-btn" title="View Details" onClick={() => handleViewLog(log)}>
                        <FaEye />
                      </button>
                      {mode === 'supervisor' && (
                        disputed ? (
                          <button className="btn btn--primary btn--sm" style={{ background: 'var(--color-success)' }} onClick={() => handleUndispute(log)}>Restore</button>
                        ) : (
                          <button className="btn btn--ghost btn--sm" style={{ background: 'var(--color-error)', color: 'white' }} onClick={() => { setDisputeLog(log); setDisputeReason(''); }}>Dispute</button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem' }}>
        <button className="btn btn--ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => prev - 1)}>Previous</button>
        <span style={{ fontWeight: '500', color: 'var(--color-text-light)' }}>Page {currentPage} of {pagination.total_pages}</span>
        <button className="btn btn--ghost" disabled={currentPage >= pagination.total_pages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
      </div>

      {selectedLog && <TimelogModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {disputeLog && (
        <div className="modal-overlay" onClick={() => setDisputeLog(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Dispute Time Log</h3>
              <button className="btn btn--icon" onClick={() => setDisputeLog(null)}>&times;</button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: 'var(--text-body-sm)', marginBottom: 'var(--space-4)' }}>
                Disputing the log for <strong>{disputeLog.date}</strong> ({disputeLog.total_hours}h) will exclude it from the intern's rendered hours.
              </p>
              <div className="form-group">
                <label className="form-group__label">Reason <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="e.g. Intern was not at the office location, or forgot to time out."
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setDisputeLog(null)}>Cancel</button>
              <button
                className="btn btn--primary"
                style={{ background: 'var(--color-error)' }}
                disabled={!disputeReason.trim() || disputeLoading}
                onClick={handleDispute}
              >
                {disputeLoading ? 'Disputing…' : 'Confirm Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
