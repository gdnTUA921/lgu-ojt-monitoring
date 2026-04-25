import { useState, useEffect, useRef } from 'react';
import { activitiesApi, internsApi } from '../../services/api';
import { FaEye, FaEdit, FaPlus, FaTimes, FaDownload, FaToggleOn, FaToggleOff, FaFile, FaUpload, FaTrash } from 'react-icons/fa';
import '../../styles/manage-page.css';

const MAX_INSTRUCTION_FILES = 5;

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

const submissionChip = (row, isGraded) => {
  if (!row.submission_id) return <span className="chip chip--neutral">Not Submitted</span>;
  if (isGraded && row.status === 'graded') return <span className="chip chip--success">Graded</span>;
  if (row.is_late) return <span className="chip chip--warning">Submitted (Late)</span>;
  return <span className="chip chip--primary">Submitted</span>;
};

/* ── Live file panel for edit mode (files already exist on the server) ── */
function InstructionFilesPanel({ activityId, files, onFilesChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const remaining = MAX_INSTRUCTION_FILES - files.length;

  const handleAdd = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (selected.length > remaining) {
      alert(`You can only add ${remaining} more file(s).`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      selected.forEach(f => fd.append('files[]', f));
      const res = await activitiesApi.uploadInstructionFiles(activityId, fd);
      onFilesChange(res.files || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Remove this instruction file?')) return;
    setDeleting(fileId);
    try {
      await activitiesApi.deleteInstructionFile(activityId, fileId);
      onFilesChange(files.filter(f => f.file_id !== fileId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          Instruction Files <span style={{ opacity: 0.55, fontWeight: 400 }}>({files.length}/{MAX_INSTRUCTION_FILES})</span>
        </div>
        {remaining > 0 && (
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: 12 }}>
              {uploading ? 'Uploading…' : <><FaUpload style={{ marginRight: 4 }} />Add Files</>}
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleAdd} />
          </>
        )}
      </div>
      {files.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, padding: '8px 0' }}>No instruction files yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {files.map(f => (
          <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface-container-high)', borderRadius: 6 }}>
            <FaFile style={{ fontSize: 12, color: 'var(--color-primary)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>{fmtSize(f.file_size)}</div>
            </div>
            <button type="button" className="btn btn--sm btn--ghost" style={{ padding: '2px 6px', height: 'auto', color: 'var(--color-error)', flexShrink: 0 }} onClick={() => handleDelete(f.file_id)} disabled={deleting === f.file_id} title="Remove">
              <FaTrash style={{ fontSize: 11 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Staged file picker for create mode (files held locally until save) ── */
function PendingFilePicker({ files, onChange }) {
  const fileRef = useRef(null);
  const remaining = MAX_INSTRUCTION_FILES - files.length;

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    if (files.length + picked.length > MAX_INSTRUCTION_FILES) {
      alert(`Maximum ${MAX_INSTRUCTION_FILES} instruction files allowed.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    onChange([...files, ...picked]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = (idx) => onChange(files.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          Instruction Files <span style={{ opacity: 0.55, fontWeight: 400 }}>({files.length}/{MAX_INSTRUCTION_FILES}) — optional</span>
        </div>
        {remaining > 0 && (
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>
              <FaUpload style={{ marginRight: 4 }} />Add Files
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handlePick} />
          </>
        )}
      </div>
      {files.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, padding: '8px 0' }}>No files selected yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {files.map((f, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface-container-high)', borderRadius: 6 }}>
            <FaFile style={{ fontSize: 12, color: 'var(--color-primary)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>{fmtSize(f.size)}</div>
            </div>
            <button type="button" className="btn btn--sm btn--ghost" style={{ padding: '2px 6px', height: 'auto', color: 'var(--color-error)', flexShrink: 0 }} onClick={() => remove(idx)} title="Remove">
              <FaTrash style={{ fontSize: 11 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SupervisorActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode, object = edit mode
  const [form, setForm] = useState({ title: '', description: '', has_due_date: false, due_date: '', is_graded: true, accept_late: false, target_type: 'all', intern_ids: [] });
  const [saving, setSaving] = useState(false);
  const [instructionFiles, setInstructionFiles] = useState([]); // server files (edit mode)
  const [pendingFiles, setPendingFiles] = useState([]);          // local File objects (create mode)

  const [viewActivity, setViewActivity] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [gradingId, setGradingId] = useState(null);
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' });
  const [gradeSaving, setGradeSaving] = useState(false);

  const [myInterns, setMyInterns] = useState([]);

  useEffect(() => {
    fetchActivities();
    fetchMyInterns();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await activitiesApi.supervisorList();
      setActivities(data.activities || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyInterns = async () => {
    try {
      const data = await internsApi.supervisorList();
      setMyInterns(data.interns || []);
    } catch (err) {
      console.error('Failed to fetch interns', err);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setPendingFiles([]);
    setInstructionFiles([]);
    setForm({ title: '', description: '', has_due_date: false, due_date: '', is_graded: true, accept_late: false, target_type: 'all', intern_ids: [] });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setInstructionFiles(a.instruction_files || []);
    setPendingFiles([]);
    setForm({
      title: a.title || '',
      description: a.description || '',
      has_due_date: !!a.due_date,
      due_date: a.due_date ? a.due_date.replace(' ', 'T').slice(0, 16) : '',
      is_graded: !!a.is_graded,
      accept_late: !!a.accept_late,
      target_type: a.target_type || 'all',
      intern_ids: a.intern_ids || []
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setPendingFiles([]);
    setInstructionFiles([]);
    fetchActivities();
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Title is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.has_due_date ? (form.due_date || null) : null,
        is_graded: form.is_graded,
        accept_late: form.has_due_date ? form.accept_late : false,
        target_type: form.target_type,
        intern_ids: form.target_type === 'specific' ? form.intern_ids : []
      };

      if (editing) {
        await activitiesApi.update(editing.activity_id, payload);
      } else {
        const res = await activitiesApi.create(payload);
        // Upload any staged instruction files now that we have an ID
        if (pendingFiles.length > 0) {
          const fd = new FormData();
          pendingFiles.forEach(f => fd.append('files[]', f));
          await activitiesApi.uploadInstructionFiles(res.activity_id, fd);
        }
      }

      closeForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a) => {
    if (!confirm(`Set activity "${a.title}" to ${a.is_active ? 'Inactive' : 'Active'}?`)) return;
    try {
      await activitiesApi.toggleActive(a.activity_id);
      fetchActivities();
    } catch (err) {
      alert(err.message);
    }
  };

  const openView = async (a) => {
    setViewActivity(a);
    setRoster([]);
    setRosterLoading(true);
    setGradingId(null);
    try {
      const data = await activitiesApi.listSubmissions(a.activity_id);
      setRoster(data.roster || []);
      if (data.activity) setViewActivity({ ...a, ...data.activity });
    } catch (err) {
      alert(err.message);
    } finally {
      setRosterLoading(false);
    }
  };

  const closeView = () => {
    setViewActivity(null);
    setRoster([]);
    setGradingId(null);
  };

  const handleDownloadFile = async (file) => {
    try {
      await activitiesApi.download(file.file_id, file.file_name);
    } catch (err) {
      alert(err.message);
    }
  };

  const startGrading = (row) => {
    setGradingId(row.submission_id);
    setGradeForm({ grade: row.grade || '', feedback: row.feedback || '' });
  };

  const saveGrade = async (row) => {
    setGradeSaving(true);
    try {
      await activitiesApi.gradeSubmission(row.submission_id, gradeForm);
      const data = await activitiesApi.listSubmissions(viewActivity.activity_id);
      setRoster(data.roster || []);
      setGradingId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGradeSaving(false);
    }
  };

  if (loading && !activities.length) {
    return <div className="loading-state"><div className="spinner" /><span>Loading activities…</span></div>;
  }

  return (
    <div className="manage-page" id="supervisor-activities">
      <div className="manage-page__header">
        <div>
          <h2 className="manage-page__title">Activities</h2>
          <p className="manage-page__subtitle" style={{ fontSize: 'var(--text-label-md)', opacity: 0.7 }}>
            Post activities for your interns to submit work on.
          </p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          <FaPlus /> New Activity
        </button>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Due Date</th>
              <th>Submissions</th>
              <th>Graded?</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: 0.6 }}>No activities yet.</td></tr>
            )}
            {activities.map(a => (
              <tr key={a.activity_id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{a.title}</div>
                  {a.description && (
                    <div style={{ fontSize: '12px', opacity: 0.65, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.description}
                    </div>
                  )}
                  {a.instruction_files?.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: 2 }}>
                      {a.instruction_files.length} instruction file{a.instruction_files.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </td>
                <td>{fmtDate(a.due_date)}</td>
                <td>{a.submission_count}/{a.total_interns}</td>
                <td>
                  <span className={`chip chip--${a.is_graded ? 'primary' : 'neutral'}`}>
                    {a.is_graded ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span className={`chip chip--${a.is_active ? 'success' : 'neutral'}`}>
                    {a.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="manage-page__table-actions">
                    <button className="manage-page__action-btn" title="View Submissions" onClick={() => openView(a)}><FaEye /></button>
                    <button className="manage-page__action-btn" title="Edit" onClick={() => openEdit(a)}><FaEdit /></button>
                    <button className="manage-page__action-btn" title={a.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(a)}>
                      {a.is_active ? <FaToggleOn /> : <FaToggleOff />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '90vw' }}>
            <div className="modal__header">
              <h3 className="modal__title">{editing ? 'Edit Activity' : 'New Activity'}</h3>
              <button className="btn btn--icon" onClick={closeForm}><FaTimes /></button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '70vh', overflowY: 'auto' }}>
              <label>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: 4 }}>Title *</div>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </label>
              <label>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: 4 }}>Description</div>
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Set Due Date</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Require submission before a deadline</div>
                  </div>
                  <input type="checkbox" checked={form.has_due_date} onChange={e => setForm({ ...form, has_due_date: e.target.checked, due_date: '', accept_late: false })} />
                </label>
                {form.has_due_date && (
                  <>
                    <input className="input" type="datetime-local" value={form.due_date} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', background: 'var(--color-surface-container-high)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Accept Late Submissions</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>Allow interns to submit after the due date</div>
                      </div>
                      <input type="checkbox" checked={form.accept_late} onChange={e => setForm({ ...form, accept_late: e.target.checked })} />
                    </label>
                  </>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.is_graded} onChange={e => setForm({ ...form, is_graded: e.target.checked })} />
                <span>Will be graded</span>
              </label>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: 8 }}>Target Interns</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="target_type" checked={form.target_type === 'all'} onChange={() => setForm({ ...form, target_type: 'all' })} />
                    <span>All Interns</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="target_type" checked={form.target_type === 'specific'} onChange={() => setForm({ ...form, target_type: 'specific' })} />
                    <span>Specific Interns</span>
                  </label>
                </div>
                {form.target_type === 'specific' && (
                  <div style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 8, padding: 12, maxHeight: 160, overflowY: 'auto', background: 'var(--color-surface-container-low)' }}>
                    {myInterns.length === 0 ? (
                      <div style={{ fontSize: 13, opacity: 0.6, textAlign: 'center' }}>No interns found.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {myInterns.map(i => (
                          <label key={i.intern_id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={form.intern_ids.includes(i.intern_id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...form.intern_ids, i.intern_id]
                                  : form.intern_ids.filter(id => id !== i.intern_id);
                                setForm({ ...form, intern_ids: ids });
                              }}
                            />
                            <div style={{ fontSize: 13 }}>
                              <div style={{ fontWeight: 500 }}>{i.first_name} {i.last_name}</div>
                              <div style={{ fontSize: 11, opacity: 0.7 }}>{i.school}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instruction files */}
              <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: 'var(--space-3)' }}>
                {editing ? (
                  <InstructionFilesPanel
                    activityId={editing.activity_id}
                    files={instructionFiles}
                    onFilesChange={setInstructionFiles}
                  />
                ) : (
                  <PendingFilePicker files={pendingFiles} onChange={setPendingFiles} />
                )}
              </div>
            </div>
            <div className="modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn--ghost" onClick={closeForm} disabled={saving}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions View Modal */}
      {viewActivity && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal__header">
              <div>
                <h3 className="modal__title">{viewActivity.title}</h3>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Due {fmtDate(viewActivity.due_date)} · {viewActivity.is_graded ? 'Graded' : 'Not graded'}
                </div>
              </div>
              <button className="btn btn--icon" onClick={closeView}><FaTimes /></button>
            </div>
            <div className="modal__body" style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
              {viewActivity.description && (
                <div style={{ background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {viewActivity.description}
                </div>
              )}

              {viewActivity.instruction_files?.length > 0 && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: 8 }}>
                    Instruction Files ({viewActivity.instruction_files.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {viewActivity.instruction_files.map(f => (
                      <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface-container-high)', borderRadius: 6, maxWidth: 260 }}>
                        <FaFile style={{ fontSize: 12, color: 'var(--color-primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                          <div style={{ fontSize: 10, opacity: 0.55 }}>{fmtSize(f.file_size)}</div>
                        </div>
                        <button className="btn btn--sm btn--ghost" style={{ padding: '3px 6px', height: 'auto', flexShrink: 0 }} onClick={() => handleDownloadFile(f)}>
                          <FaDownload style={{ fontSize: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rosterLoading && <div className="loading-state"><div className="spinner" /></div>}

              {!rosterLoading && roster.length === 0 && (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: 'var(--space-8) 0' }}>No interns assigned to you.</p>
              )}

              {!rosterLoading && roster.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {roster.map(row => (
                    <div key={row.intern_id} style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 10, padding: '14px 16px', background: 'var(--color-surface-container-low)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{row.first_name} {row.last_name}</div>
                          <div style={{ fontSize: 11, opacity: 0.65 }}>{row.school}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {submissionChip(row, viewActivity.is_graded)}
                          {row.submitted_at && (
                            <span style={{ fontSize: 11, opacity: 0.6 }}>Submitted {fmtDate(row.submitted_at)}</span>
                          )}
                        </div>
                      </div>

                      {row.submission_id && row.files?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: 6 }}>
                            {row.files.length} File{row.files.length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {row.files.map(f => (
                              <div key={f.file_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface-container-high)', borderRadius: 6, maxWidth: 260 }}>
                                <FaFile style={{ fontSize: 13, color: 'var(--color-primary)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                                  <div style={{ fontSize: 10, opacity: 0.55 }}>{fmtSize(f.file_size)}</div>
                                </div>
                                <button className="btn btn--sm btn--ghost" style={{ padding: '3px 6px', height: 'auto', flexShrink: 0 }} onClick={() => handleDownloadFile(f)}>
                                  <FaDownload style={{ fontSize: 11 }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {viewActivity.is_graded && row.submission_id && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-outline-variant)' }}>
                          {gradingId === row.submission_id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <input className="input" placeholder="Grade (e.g. A, 95, Pass)" value={gradeForm.grade}
                                onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} style={{ fontSize: 13 }} />
                              <textarea className="input" placeholder="Feedback (optional)" rows={2} value={gradeForm.feedback}
                                onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} style={{ fontSize: 13 }} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn--primary btn--sm" disabled={gradeSaving} onClick={() => saveGrade(row)}>
                                  {gradeSaving ? 'Saving…' : 'Save Grade'}
                                </button>
                                <button className="btn btn--ghost btn--sm" onClick={() => setGradingId(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: 2 }}>Grade</div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{row.grade || '—'}</div>
                                {row.feedback && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{row.feedback}</div>}
                              </div>
                              <button className="btn btn--ghost btn--sm" style={{ flexShrink: 0 }} onClick={() => startGrading(row)}>
                                <FaEdit style={{ marginRight: 4 }} />{row.grade ? 'Edit Grade' : 'Add Grade'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
