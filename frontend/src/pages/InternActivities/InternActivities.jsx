import { useState, useEffect, useRef } from 'react';
import { activitiesApi } from '../../services/api';
import { FaEye, FaDownload, FaTimes, FaUpload, FaFile } from 'react-icons/fa';
import '../../styles/manage-page.css';

const MAX_BYTES = 52428800; // 50 MB
const MAX_FILES = 10;

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v.replace(' ', 'T'));
  if (isNaN(d)) return v;
  return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const statusChip = (a) => {
  if (!a.submission_id) {
    if (a.past_due) return <span className="chip chip--error">Missed</span>;
    return <span className="chip chip--warning">Not Submitted</span>;
  }
  if (a.is_graded && a.submission_status === 'graded') return <span className="chip chip--success">Graded</span>;
  if (a.is_late) return <span className="chip chip--warning">Submitted (Late)</span>;
  return <span className="chip chip--primary">Submitted</span>;
};

export default function InternActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchActivities(); }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await activitiesApi.internList();
      setActivities(data.activities || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (a) => setSelected(a);
  const closeModal = () => {
    setSelected(null);
    setComments('');
    setSelectedFiles([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (newFiles) => {
    const total = selectedFiles.length + newFiles.length;
    if (total > MAX_FILES) {
      alert(`You can only upload up to ${MAX_FILES} files.`);
      return;
    }
    const totalBytes = [...selectedFiles, ...newFiles].reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > MAX_BYTES) {
      alert('Total size exceeds 50 MB limit.');
      return;
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canSubmit = (a) => {
    if (a.submission_status === 'graded') return false;
    if (a.past_due && a.submission_id) return false;
    if (a.past_due && !a.accept_late) return false;
    return true;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) { alert('Please choose at least one file.'); return; }
    if (selected.submission_id && !confirm('Replace your current submission with these files?')) return;

    setUploading(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append('files[]', f));
      fd.append('comments', comments);
      await activitiesApi.submit(selected.activity_id, fd);
      await fetchActivities();
      const refreshed = (await activitiesApi.internList()).activities.find(x => x.activity_id === selected.activity_id);
      setSelected(refreshed || null);
      setSelectedFiles([]);
      setComments('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      await activitiesApi.download(file.file_id, file.file_name);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !activities.length) {
    return <div className="loading-state"><div className="spinner" /><span>Loading activities…</span></div>;
  }

  return (
    <div className="manage-page" id="intern-activities">
      <div className="manage-page__header">
        <div>
          <h2 className="manage-page__title">Activities</h2>
          <p className="manage-page__subtitle" style={{ fontSize: 'var(--text-label-md)', opacity: 0.7 }}>
            Activities assigned by your supervisor. Submit files up to 50 MB.
          </p>
        </div>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Due Date</th>
              <th>Graded?</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: 0.6 }}>
                No activities yet.
              </td></tr>
            )}
            {activities.map(a => (
              <tr key={a.activity_id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{a.title}</div>
                  {a.description && (
                    <div style={{ fontSize: 12, opacity: 0.65, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.description}
                    </div>
                  )}
                </td>
                <td>{fmtDate(a.due_date)}</td>
                <td>
                  <span className={`chip chip--${a.is_graded ? 'primary' : 'neutral'}`}>
                    {a.is_graded ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{statusChip(a)}</td>
                <td>{a.is_graded ? (a.grade || '—') : '—'}</td>
                <td>
                  <div className="manage-page__table-actions">
                    <button className="manage-page__action-btn" title="View / Submit" onClick={() => openModal(a)}>
                      <FaEye />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal__header">
              <div>
                <h3 className="modal__title">{selected.title}</h3>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Due {fmtDate(selected.due_date)} · {selected.is_graded ? 'Graded' : 'Not graded'}
                </div>
              </div>
              <button className="btn btn--icon" onClick={closeModal}><FaTimes /></button>
            </div>

            <div className="modal__body" style={{ overflowY: 'auto', flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selected.description && (
                <div style={{ background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                  {selected.description}
                </div>
              )}

              {/* Supervisor instruction files */}
              {selected.instruction_files?.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: 8 }}>
                    Instruction Files ({selected.instruction_files.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.instruction_files.map(f => (
                      <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--color-surface-container-high)', borderRadius: 6 }}>
                        <FaFile style={{ fontSize: 13, color: 'var(--color-primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                          <div style={{ fontSize: 11, opacity: 0.55 }}>{fmtSize(f.file_size)}</div>
                        </div>
                        <button
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '4px 8px', height: 'auto', fontSize: 11, flexShrink: 0 }}
                          onClick={() => handleDownloadFile(f)}
                        >
                          <FaDownload />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current submission */}
              {selected.submission_id ? (
                <div style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 }}>Your Submission</div>
                    {statusChip(selected)}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.files?.map(f => (
                      <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: 'var(--color-surface-container-low)', borderRadius: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>{fmtSize(f.file_size)}</div>
                        </div>
                        <button className="btn btn--ghost btn--sm" style={{ padding: '4px 8px', height: 'auto', fontSize: 11 }} onClick={() => handleDownloadFile(f)}>
                          <FaDownload />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
                    Submitted {fmtDate(selected.submitted_at)}
                  </div>
                  
                  {selected.comments && (
                    <div style={{ marginTop: 12, padding: 10, background: 'var(--color-surface-container-high)', borderRadius: 6, fontSize: 13 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Intern's Remarks</div>
                      <div style={{ color: 'var(--color-on-surface)' }}>{selected.comments}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, fontSize: 13, opacity: 0.8 }}>
                  You haven't submitted anything yet.
                </div>
              )}

              {/* Grade/feedback (if applicable) */}
              {selected.is_graded && selected.submission_status === 'graded' && (
                <div style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>Grade & Feedback</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{selected.grade || '—'}</div>
                  {selected.feedback && (
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', opacity: 0.8 }}>{selected.feedback}</div>
                  )}
                </div>
              )}

              {/* Upload */}
              {selected.past_due && !selected.accept_late && !selected.submission_id && selected.submission_status !== 'graded' && (
                <div style={{ padding: 12, background: 'var(--color-error-container, #fee)', color: 'var(--color-on-error-container, #900)', borderRadius: 8, fontSize: 13 }}>
                  The due date has passed. Submissions are closed.
                </div>
              )}
              {canSubmit(selected) && (
                <div
                  className={`drag-area ${isDragging ? 'drag-area--dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: '2px dashed var(--color-outline-variant)',
                    borderRadius: 12,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: isDragging ? 'var(--color-primary-container, #e3f2fd)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7, marginBottom: 16 }}>
                    {selected.submission_id ? 'Resubmit your work' : 'Submit your work'}
                  </div>

                  <div 
                    onClick={() => fileRef.current?.click()}
                    style={{ cursor: 'pointer', marginBottom: selectedFiles.length > 0 ? 12 : 0 }}
                  >
                    <FaUpload style={{ fontSize: 32, color: 'var(--color-primary)', marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      Drag and drop up to {MAX_FILES} files or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Total max 50 MB</div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {selectedFiles.map((f, idx) => (
                        <div key={idx} style={{ padding: '10px 12px', background: 'var(--color-surface-container-high)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                          <div style={{ width: 32, height: 32, background: 'var(--color-primary-container)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FaUpload style={{ color: 'white', fontSize: 14 }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>{fmtSize(f.size)}</div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeSelectedFile(idx); }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: 4 }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) addFiles(Array.from(e.target.files));
                    }}
                    style={{ display: 'none' }}
                  />

                  <div style={{ marginTop: 16, textAlign: 'left' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                      Comments (Optional)
                    </label>
                    <textarea
                      className="input"
                      placeholder="Add a comment about your submission..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      style={{ resize: 'none', fontSize: 13 }}
                    />
                  </div>

                  <button
                    className="btn btn--primary"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{ marginTop: 16, width: '100%' }}
                  >
                    {uploading ? 'Uploading…' : (selected.submission_id ? 'Replace Submission' : 'Submit Activity')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
