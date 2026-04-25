import { useState, useEffect } from 'react';
import { usersApi, departmentsApi, timelogsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaSearch, FaUserPlus, FaEdit, FaEye, FaBan, FaCheck, FaTimes } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total_items: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [departments, setDepartments] = useState([]);

  // View Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [viewTimelogs, setViewTimelogs] = useState([]);
  const [viewTimelogsLoading, setViewTimelogsLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Form state
  const [form, setForm] = useState({
    email: '', password: '', user_type: 'intern',
    first_name: '', middle_name: '', last_name: '',
    contact_num: '', department_id: '', school: '',
    required_hours: '', start_date: '', end_date: '',
    supervisor_id: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchSupervisors();
  }, [filterRole, filterStatus, currentPage]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1); // Reset to page 1 on filter
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.list({
        user_type: filterRole || undefined,
        is_active: filterStatus || undefined,
        page: currentPage,
        limit: 10
      });
      setUsers(data.users || []);
      setPagination(data.pagination || { total_pages: 1, total_items: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load users.');
      setUsers([
        { user_id: 1, email: 'admin@mandaluyong.gov.ph', user_type: 'admin', first_name: 'Admin', last_name: 'User', is_active: true, is_2fa_enabled: true },
        { user_id: 2, email: 'supervisor@demo.com', user_type: 'supervisor', first_name: 'Mark', last_name: 'Reyes', is_active: true, is_2fa_enabled: false },
        { user_id: 3, email: 'intern@demo.com', user_type: 'intern', first_name: 'Maria', last_name: 'Santos', is_active: true, is_2fa_enabled: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentsApi.list();
      setDepartments(data.departments || data || []);
    } catch {
      setDepartments([
        { department_id: 1, department_name: 'IT Department' },
      ]);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const data = await usersApi.list({ user_type: 'supervisor' });
      setSupervisors(data.users || data || []);
    } catch {
      setSupervisors([]);
    }
  };

  const openViewModal = async (u) => {
    setViewUser(u);
    setShowViewModal(true);
    if (u.user_type === 'intern') {
      setViewTimelogsLoading(true);
      try {
        const data = await timelogsApi.list({ user_id: u.user_id });
        setViewTimelogs(data.timelogs || data || []);
      } catch (err) {
        setViewTimelogs([]);
      } finally {
        setViewTimelogsLoading(false);
      }
    } else {
      setViewTimelogs([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editUser) {
        await usersApi.update(editUser.user_id, form);
        showToast('User updated successfully!', 'success');
      } else {
        await usersApi.create(form);
        showToast('User registered successfully!', 'success');
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Operation failed.');
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.is_active ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this user (${user.email})?`)) {
      return;
    }

    try {
      await usersApi.toggleStatus(user.user_id);
      showToast(`User ${action}d successfully!`, 'success');
      fetchUsers();
    } catch (err) {
      setError(err.message || `Failed to ${action} user.`);
      showToast(err.message || `Failed to ${action} user.`, 'error');
    }
  };

  const openEditModal = (u) => {
    setEditUser(u);
    setForm({
      email: u.email, password: '', user_type: u.user_type,
      first_name: u.first_name || '', middle_name: u.middle_name || '',
      last_name: u.last_name || '', contact_num: u.contact_num || '',
      department_id: u.department_id || '', school: u.school || '',
      required_hours: u.required_hours || '', start_date: u.start_date || '',
      end_date: u.end_date || '', supervisor_id: u.supervisor_id || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditUser(null);
    setForm({
      email: '', password: 'ChangeMe@123!', user_type: 'intern',
      first_name: '', middle_name: '', last_name: '',
      contact_num: '', department_id: '', school: '',
      required_hours: '', start_date: '', end_date: '',
      supervisor_id: '',
    });
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      (u.first_name?.toLowerCase().includes(term) || u.last_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term))
    );
  });

  const initials = (u) => `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase();

  if (loading && !users.length) {
    return <div className="loading-state"><div className="spinner" /><span>Loading users…</span></div>;
  }

  return (
    <div className="manage-page" id="user-management">
      <div className="manage-page__header">
        <h2 className="manage-page__title">User Management</h2>
        <div className="manage-page__actions">
          <button className="btn btn--primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FaUserPlus style={{ marginRight: '8px' }} /> Register User
          </button>
        </div>
      </div>

      <div className="manage-page__filters">
        <div className="manage-page__search">
          <span className="manage-page__search-icon"><FaSearch /></span>
          <input className="input" placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <select className="manage-page__filter-select" value={filterRole} onChange={(e) => handleFilterChange(setFilterRole, e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="intern">Intern</option>
        </select>
        <select className="manage-page__filter-select" value={filterStatus} onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}>
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr><th>User</th><th>Role</th><th>2FA</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.user_id}>
                <td>
                  <div className="manage-page__user-cell">
                    <div className="manage-page__user-avatar">{initials(u)}</div>
                    <div>
                      <div className="manage-page__user-name">{u.first_name} {u.middle_name} {u.last_name}</div>
                      <div className="manage-page__user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`chip chip--${u.user_type === 'admin' ? 'info' : u.user_type === 'supervisor' ? 'warning' : 'neutral'}`}>{u.user_type}</span></td>
                <td>{u.is_2fa_enabled ? <FaCheck style={{ color: 'var(--color-success)' }} /> : '—'}</td>
                <td><span className={`chip chip--${u.is_active ? 'success' : 'error'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="manage-page__table-actions" style={{ gap: '0.5rem', display: 'flex' }}>
                    <button className="btn btn--primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openEditModal(u)}>UPDATE</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#64748b', color: 'white' }} onClick={() => openViewModal(u)}>VIEW</button>
                    {(u.user_type !== 'admin' || u.user_id !== currentUser?.user_id) && (
                      <button className={`btn ${u.is_active ? 'btn--danger' : 'btn--success'}`} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: !u.is_active ? '#1B6D2E' : undefined, color: !u.is_active ? 'white' : undefined }} onClick={() => handleToggleStatus(u)}>
                        {u.is_active ? 'DISABLE' : 'ENABLE'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem' }}>
        <button 
          className="btn btn--ghost" 
          disabled={currentPage <= 1} 
          onClick={() => setCurrentPage(prev => prev - 1)}
          style={{ padding: '8px 16px' }}
        >
          Previous
        </button>
        <span style={{ fontWeight: '500', color: 'var(--color-text-light)' }}>
          Page {currentPage} of {pagination.total_pages}
        </span>
        <button 
          className="btn btn--ghost" 
          disabled={currentPage >= pagination.total_pages} 
          onClick={() => setCurrentPage(prev => prev + 1)}
          style={{ padding: '8px 16px' }}
        >
          Next
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal__header">
              <h3 className="modal__title">{editUser ? 'Edit User' : 'Register New User'}</h3>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <div className="modal__body">
              <form className="manage-page__form" onSubmit={handleSubmit}>
                <div className="manage-page__form-row">
                  <div className="form-group">
                    <label className="form-group__label">First Name</label>
                    <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Middle Name</label>
                    <input className="input" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Last Name</label>
                    <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                  </div>
                </div>
                <div className="manage-page__form-row">
                  <div className="form-group">
                    <label className="form-group__label">Email</label>
                    <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Role</label>
                    <select className="input" value={form.user_type} onChange={(e) => setForm({ ...form, user_type: e.target.value })}>
                      <option value="intern">Intern</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Contact Number</label>
                    <input className="input" value={form.contact_num} onChange={(e) => setForm({ ...form, contact_num: e.target.value })} />
                  </div>
                </div>

                {form.user_type === 'intern' && (
                  <>
                    <div className="manage-page__form-row">
                      <div className="form-group">
                        <label className="form-group__label">Department</label>
                        <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value, supervisor_id: '' })}>
                          <option value="">Select Department</option>
                          {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-group__label">Supervisor</label>
                        <select className="input" value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })} disabled={!form.department_id}>
                          <option value="">{form.department_id ? 'Select Supervisor' : 'Select Department First'}</option>
                          {supervisors
                            .filter(s => Number(s.department_id) === Number(form.department_id))
                            .map((s) => <option key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="manage-page__form-row">
                      <div className="form-group">
                        <label className="form-group__label">School / University</label>
                        <input className="input" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-group__label">Required Hours</label>
                        <input className="input" type="number" value={form.required_hours} onChange={(e) => setForm({ ...form, required_hours: e.target.value })} />
                      </div>
                    </div>
                    <div className="manage-page__form-row">
                      <div className="form-group">
                        <label className="form-group__label">Start Date</label>
                        <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-group__label">End Date</label>
                        <input className="input" type="date" value={form.end_date} disabled readOnly title="End date is automatically set when internship is completed" />
                      </div>
                    </div>
                  </>
                )}

                {form.user_type === 'supervisor' && (
                  <div className="manage-page__form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label className="form-group__label">Department</label>
                      <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                        <option value="">Select Department</option>
                        {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="modal__footer" style={{ padding: 0 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary" disabled={formLoading}>{formLoading ? 'Saving…' : 'Save User'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal__header">
              <h3 className="modal__title">View {viewUser.user_type === 'admin' ? 'Admin' : viewUser.user_type === 'supervisor' ? 'Supervisor' : 'Intern'}</h3>
              <button className="btn btn--icon" onClick={() => setShowViewModal(false)}><FaTimes /></button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', 
                  color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem',
                  backgroundImage: viewUser.pfpic ? `url(${viewUser.pfpic})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center'
                }}>
                  {!viewUser.pfpic && initials(viewUser)}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{viewUser.first_name} {viewUser.middle_name} {viewUser.last_name}</h4>
                  <p style={{ margin: '0', color: 'var(--color-text-light)' }}>{viewUser.email} • <span style={{ textTransform: 'capitalize' }}>{viewUser.user_type}</span></p>
                  {viewUser.contact_num && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Contact: {viewUser.contact_num}</p>}
                </div>
              </div>

              {viewUser.user_type === 'intern' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--color-bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div><strong>School:</strong> {viewUser.school || 'N/A'}</div>
                  <div><strong>Required Hours:</strong> {viewUser.required_hours || 'N/A'}</div>
                  <div><strong>Start Date:</strong> {viewUser.start_date || 'N/A'}</div>
                  <div><strong>End Date:</strong> {viewUser.end_date || 'N/A'}</div>
                  <div><strong>Status:</strong> {viewUser.status || 'N/A'}</div>
                </div>
              )}

              {viewUser.user_type === 'intern' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Time Logs</h4>
                  {viewTimelogsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Loading timelogs...</div>
                  ) : viewTimelogs.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="manage-page__table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                          <tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {viewTimelogs.map((log) => {
                            const disputed = Number(log.is_disputed) === 1;
                            return (
                              <tr key={log.timelog_id} style={{ background: disputed ? 'var(--color-error-container, #fff0f0)' : undefined }}>
                                <td>
                                  <div>{log.date}</div>
                                  {disputed && <div style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 700 }}>DISPUTED</div>}
                                </td>
                                <td>{log.time_in || '—'}</td>
                                <td>{log.time_out || '—'}</td>
                                <td style={{ textDecoration: disputed ? 'line-through' : 'none' }}>{log.total_hours || '0'}</td>
                                <td>
                                  <span className={`chip chip--${disputed ? 'error' : 'success'}`}>
                                    {disputed ? 'Disputed' : 'Active'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-text-light)', margin: 0 }}>No timelogs found for this intern.</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--primary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: '8px', color: 'white',
          boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.1))', display: 'flex', alignItems: 'center', gap: '0.75rem',
          backgroundColor: toast.type === 'success' ? 'var(--color-success, #1B6D2E)' : 'var(--color-error, #BA1A1A)',
          transition: 'all 0.3s ease'
        }}>
          {toast.type === 'success' ? <FaCheck /> : <FaTimes />}
          <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
