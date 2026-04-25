import { useState, useEffect } from 'react';
import { internsApi, documentsApi, timelogsApi } from '../../services/api';
import { FaEye, FaSearch, FaCheckCircle, FaTimes, FaBan, FaFilePdf, FaFileCsv } from 'react-icons/fa';
import { downloadTimelogsPDF, downloadTimelogsCSV } from '../../utils/exportTimelogs';
import '../../styles/manage-page.css';

const TAB_DETAILS = 'Details';
const TAB_REQUIREMENTS = 'Requirements';
const TAB_TIMELOGS = 'Time Logs';
const TABS = [TAB_DETAILS, TAB_REQUIREMENTS, TAB_TIMELOGS];

const statusChip = (status) => {
  const map = { approved: 'success', rejected: 'error', pending: 'warning' };
  return <span className={`chip chip--${map[status] ?? 'neutral'}`}>{status ?? 'Not Submitted'}</span>;
};

export default function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState('start_desc');

  const [selectedIntern, setSelectedIntern] = useState(null);
  const [modalTab, setModalTab] = useState(TAB_DETAILS);
  const [requirements, setRequirements] = useState([]);
  const [reqStats, setReqStats] = useState({ total: 0, submitted: 0, approved: 0 });
  const [reqLoading, setReqLoading] = useState(false);
  const [timelogs, setTimelogs] = useState([]);
  const [tlogLoading, setTlogLoading] = useState(false);
  const [disputeLog, setDisputeLog] = useState(null); // timelog being disputed
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => { fetchInterns(); }, [filterStatus, sortOrder]);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const data = await internsApi.supervisorList({
        status: filterStatus || undefined,
        sort: sortOrder || undefined
      });
      setInterns(data.interns || []);
    } catch {
      setInterns([
        { intern_id: 1, user_id: 1, first_name: 'Maria', last_name: 'Santos', school: 'PUP', required_hours: 500, rendered_hours: 320, status: 'incomplete', department_name: 'IT', start_date: '2024-06-01', end_date: '2024-12-01' },
        { intern_id: 2, user_id: 2, first_name: 'Juan', last_name: 'Dela Cruz', school: 'UST', required_hours: 400, rendered_hours: 400, status: 'complete', department_name: 'Engineering', start_date: '2024-06-01', end_date: '2024-11-01' },
        { intern_id: 3, user_id: 3, first_name: 'Ana', last_name: 'Reyes', school: 'DLSU', required_hours: 600, rendered_hours: 150, status: 'incomplete', department_name: 'IT', start_date: '2024-07-01', end_date: '2025-01-01' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (internId) => {
    if (!confirm('Mark this intern as complete?')) return;
    try {
      await internsApi.markComplete(internId);
      fetchInterns();
    } catch (err) {
      const missing = err.body?.missing;
      if (!missing) { alert(err.message); return; }
      const lines = ['Cannot mark as complete — the following are not yet met:\n'];
      if (missing.hours) lines.push(`• Hours: ${missing.hours.rendered}h rendered of ${missing.hours.required}h required (${missing.hours.short}h remaining)`);
      if (missing.documents?.length) lines.push(`• Unapproved mandatory documents:\n   - ${missing.documents.join('\n   - ')}`);
      alert(lines.join('\n'));
    }
  };

  const handleTerminate = async (internId) => {
    if (!confirm('Are you sure you want to TERMINATE this intern? This will also deactivate their account.')) return;
    try {
      await internsApi.markTerminated(internId);
      fetchInterns();
    } catch (err) {
      alert(err.message);
    }
  };

  const openModal = async (intern) => {
    setSelectedIntern(intern);
    setModalTab(TAB_DETAILS);
    setRequirements([]);
    setTimelogs([]);

    setReqLoading(true);
    setTlogLoading(true);

    try {
      const data = await documentsApi.getInternRequirements(intern.intern_id);
      setRequirements(data.requirements || []);
      setReqStats(data.stats || { total: 0, submitted: 0, approved: 0 });
    } catch { /* fallback empty */ }
    finally { setReqLoading(false); }

    try {
      const data = await timelogsApi.list({ user_id: intern.user_id, limit: 50 });
      setTimelogs(data.timelogs || []);
    } catch { /* fallback empty */ }
    finally { setTlogLoading(false); }
  };

  const closeModal = () => setSelectedIntern(null);

  const fetchTimelogs = async (intern) => {
    setTlogLoading(true);
    try {
      const data = await timelogsApi.list({ user_id: intern.user_id, limit: 50 });
      setTimelogs(data.timelogs || []);
    } catch { /* fallback empty */ }
    finally { setTlogLoading(false); }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setDisputeLoading(true);
    try {
      await timelogsApi.dispute(disputeLog.timelog_id, { is_disputed: true, dispute_reason: disputeReason.trim() });
      setDisputeLog(null);
      setDisputeReason('');
      fetchTimelogs(selectedIntern);
      fetchInterns();
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
      fetchTimelogs(selectedIntern);
      fetchInterns();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = interns.filter(i => {
    const term = search.toLowerCase();
    return i.first_name?.toLowerCase().includes(term) || i.last_name?.toLowerCase().includes(term);
  });

  if (loading && !interns.length) {
    return <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>;
  }

  return (
    <div className="manage-page" id="manage-interns">
      <div className="manage-page__header">
        <h2 className="manage-page__title">My Interns</h2>
      </div>

      <div className="manage-page__filters">
        <div className="manage-page__search">
          <span className="manage-page__search-icon"><FaSearch /></span>
          <input className="input" placeholder="Search interns…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <select className="manage-page__filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="incomplete">Incomplete</option>
            <option value="complete">Complete</option>
            <option value="terminated">Terminated</option>
          </select>
          <select className="manage-page__filter-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
            <option value="start_desc">Newest Started</option>
            <option value="start_asc">Oldest Started</option>
          </select>
        </div>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table" id="interns-table">
          <thead>
            <tr>
              <th>Intern</th>
              <th>School</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(intern => {
              const pct = intern.required_hours > 0
                ? Math.min(100, Math.round((intern.rendered_hours / intern.required_hours) * 100))
                : 0;
              return (
                <tr key={intern.intern_id}>
                  <td>
                    <div className="manage-page__user-cell">
                      <div className="manage-page__user-avatar">
                        {(intern.first_name?.[0] || '') + (intern.last_name?.[0] || '')}
                      </div>
                      <div>
                        <div className="manage-page__user-name">{intern.first_name} {intern.last_name}</div>
                        <div className="manage-page__user-email">{intern.department_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{intern.school}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--color-surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-label-md)', fontWeight: 'var(--weight-semibold)', minWidth: '36px' }}>{pct}%</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-label-sm)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                      {intern.rendered_hours}/{intern.required_hours}h
                    </div>
                  </td>
                  <td>
                    <span className={`chip chip--${intern.status === 'complete' ? 'success' : intern.status === 'terminated' ? 'error' : 'warning'}`}>
                      {intern.status}
                    </span>
                  </td>
                  <td>
                    <div className="manage-page__table-actions">
                      <button className="manage-page__action-btn" title="View Details" onClick={() => openModal(intern)}>
                        <FaEye />
                      </button>
                      {intern.status === 'incomplete' && (
                        <>
                          <button className="manage-page__action-btn" title="Mark Complete" onClick={() => handleMarkComplete(intern.intern_id)}>
                            <FaCheckCircle style={{ color: 'var(--color-success)' }} />
                          </button>
                          <button className="manage-page__action-btn" title="Terminate" onClick={() => handleTerminate(intern.intern_id)}>
                            <FaBan style={{ color: 'var(--color-error)' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedIntern && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px', width: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div className="modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="manage-page__user-avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
                  {(selectedIntern.first_name?.[0] || '') + (selectedIntern.last_name?.[0] || '')}
                </div>
                <div>
                  <h3 className="modal__title">{selectedIntern.first_name} {selectedIntern.last_name}</h3>
                  <span className={`chip chip--${selectedIntern.status === 'complete' ? 'success' : selectedIntern.status === 'terminated' ? 'error' : 'warning'}`} style={{ fontSize: '11px' }}>
                    {selectedIntern.status}
                  </span>
                </div>
              </div>
              <button className="btn btn--icon" onClick={closeModal}><FaTimes /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-outline-variant)', paddingLeft: 'var(--space-5)' }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'none',
                    border: 'none',
                    borderBottom: modalTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: modalTab === tab ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                    fontWeight: modalTab === tab ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: 'var(--text-body-sm)',
                    marginBottom: '-1px',
                    whiteSpace: 'nowrap',
                  }}
                >{tab}</button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="modal__body" style={{ overflowY: 'auto', flex: 1, padding: '25px' }}>
              {/* --- DETAILS TAB --- */}
              {modalTab === TAB_DETAILS && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {[
                    ['Department', selectedIntern.department_name],
                    ['School', selectedIntern.school],
                    ['Contact', selectedIntern.contact_num || '—'],
                    ['Required Hours', selectedIntern.required_hours + 'h'],
                    ['Rendered Hours', selectedIntern.rendered_hours + 'h'],
                    ['Start Date', selectedIntern.start_date || '—'],
                    ['End Date', selectedIntern.end_date || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-1)' }}>{label}</div>
                      <div style={{ fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- REQUIREMENTS TAB (read-only for supervisor) --- */}
              {modalTab === TAB_REQUIREMENTS && (
                <div>
                  <div style={{ display: 'flex', gap: 'var(--space-6)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-body-sm)' }}>
                    <span><strong>{reqStats.total}</strong> Total</span>
                    <span style={{ color: 'var(--color-success)' }}><strong>{reqStats.approved}</strong> Approved</span>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}><strong>{reqStats.total - reqStats.approved}</strong> Pending</span>
                  </div>

                  {reqLoading && <div className="loading-state"><div className="spinner" /></div>}
                  {!reqLoading && requirements.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.6, padding: 'var(--space-8) 0' }}>No active requirements found.</p>
                  )}
                  {!reqLoading && requirements.map(req => (
                    <div key={req.document_type_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500 }}>{req.name}</span>
                          <span className={`chip chip--${Number(req.is_required) ? 'error' : 'neutral'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {Number(req.is_required) ? 'Mandatory' : 'Optional'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.65 }}>{req.description}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {statusChip(req.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- TIME LOGS TAB --- */}
              {modalTab === TAB_TIMELOGS && (
                <div>
                  {!tlogLoading && timelogs.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => downloadTimelogsCSV(timelogs, `timelogs_${selectedIntern.first_name}_${selectedIntern.last_name}_${new Date().toISOString().slice(0,10)}.csv`)} title="Download CSV">
                        <FaFileCsv /> CSV
                      </button>
                      <button className="btn btn--primary btn--sm" onClick={() => downloadTimelogsPDF(timelogs, { title: 'Time Logs Report', subtitle: `${selectedIntern.first_name} ${selectedIntern.last_name}` })} title="Download PDF">
                        <FaFilePdf /> PDF
                      </button>
                    </div>
                  )}
                  {tlogLoading && <div className="loading-state"><div className="spinner" /></div>}
                  {!tlogLoading && timelogs.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.6, padding: 'var(--space-8) 0' }}>No time logs found.</p>
                  )}
                  {!tlogLoading && timelogs.length > 0 && (
                    <table className="manage-page__table" style={{ fontSize: 'var(--text-body-sm)' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Hours</th>
                          <th>Overtime</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timelogs.map(log => {
                          const disputed = Number(log.is_disputed) === 1;
                          return (
                            <tr key={log.timelog_id} style={{ background: disputed ? 'var(--color-error-container, #fff0f0)' : undefined }}>
                              <td>
                                <div>{log.date}</div>
                                {disputed && (
                                  <div style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 700 }}>DISPUTED</div>
                                )}
                              </td>
                              <td>{log.time_in ?? '—'}</td>
                              <td>{log.time_out ?? '—'}</td>
                              <td style={{ textDecoration: disputed ? 'line-through' : 'none' }}>{log.total_hours ?? '—'}h</td>
                              <td>{log.overtime_hours > 0 ? log.overtime_hours + 'h' : '—'}</td>
                              <td>
                                {disputed ? (
                                  <button className="btn btn--primary btn--sm" style={{ background: 'var(--color-success)', color: 'white' }} onClick={() => handleUndispute(log)}>Restore</button>
                                ) : (
                                  <button className="btn btn--ghost btn--sm" style={{ background: 'var(--color-error)', color: 'white' }} onClick={() => { setDisputeLog(log); setDisputeReason(''); }}>Dispute</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dispute Reason Modal */}
      {disputeLog && (
        <div className="modal-overlay" onClick={() => setDisputeLog(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Dispute Time Log</h3>
              <button className="btn btn--icon" onClick={() => setDisputeLog(null)}><FaTimes /></button>
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
