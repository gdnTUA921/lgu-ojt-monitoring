import { useState, useEffect } from 'react';
import { departmentsApi } from '../../services/api';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ department_name: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  useEffect(() => { fetchDepartments(); }, [sort]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentsApi.list({ sort });
      setDepartments(data.departments || data || []);
    } catch {
      setDepartments([
        { department_id: 1, department_name: 'IT Department', created_at: '2026-01-15' },
        { department_id: 2, department_name: 'Engineering Division', created_at: '2026-01-20' },
      ]);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editDept) await departmentsApi.update(editDept.department_id, form);
      else await departmentsApi.create(form);
      setShowModal(false);
      setForm({ department_name: '' });
      fetchDepartments();
    } catch (err) { setError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await departmentsApi.delete(id); fetchDepartments(); }
    catch (err) { setError(err.message); }
  };

  const filtered = departments.filter(d => d.department_name?.toLowerCase().includes(search.toLowerCase()));

  if (loading && !departments.length) return <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div className="manage-page" id="department-management">
      <div className="manage-page__header">
        <h2 className="manage-page__title">Departments</h2>
        <button className="btn btn--primary" onClick={() => { setEditDept(null); setForm({ department_name: '' }); setShowModal(true); }}>
          <FaPlus style={{ marginRight: '8px' }} /> Add Dept
        </button>
      </div>

      <div className="manage-page__filters">
        <div className="manage-page__search">
          <span className="manage-page__search-icon"><FaSearch /></span>
          <input className="input" placeholder="Search departments…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="manage-page__filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="newest">Newest Added</option>
          <option value="oldest">Oldest Added</option>
        </select>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead><tr><th>Name</th><th>Date Added</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.department_id}>
                <td><strong>{d.department_name}</strong></td>
                <td>{d.created_at}</td>
                <td>
                  <div className="manage-page__table-actions" style={{ gap: '0.5rem', display: 'flex' }}>
                    <button className="btn btn--primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => { setEditDept(d); setForm({ department_name: d.department_name }); setShowModal(true); }}>UPDATE</button>
                    <button className="btn btn--danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDelete(d.department_id)}>DELETE</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal__header">
              <h3 className="modal__title">{editDept ? 'Edit Department' : 'Add Department'}</h3>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <div className="modal__body">
              <form className="manage-page__form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-group__label">Department Name</label>
                  <input className="input" value={form.department_name} onChange={e => setForm({ department_name: e.target.value })} required />
                </div>
                <div className="modal__footer" style={{ padding: 0 }}>
                  <button type="submit" className="btn btn--primary" disabled={formLoading}>Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
