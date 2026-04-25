import { useState, useEffect } from 'react';
import { documentTypesApi } from '../../services/api';
import { FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaTimes, FaFileAlt } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function RequirementSettings() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_required: true,
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await documentTypesApi.list();
      setTypes(data.document_types || data || []);
    } catch {
      // Demo Data
      setTypes([
        { document_type_id: 1, name: 'Resume / CV', description: 'Updated professional profile', is_required: true, is_active: true },
        { document_type_id: 2, name: 'Memorandum of Agreement', description: 'Signed MOA from school', is_required: true, is_active: true },
        { document_type_id: 3, name: 'Endorsement Letter', description: 'Official letter from the dean', is_required: true, is_active: true },
        { document_type_id: 4, name: 'PAG-IBIG Number', description: 'Member verification', is_required: false, is_active: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editType) {
        await documentTypesApi.update(editType.document_type_id, form);
      } else {
        await documentTypesApi.create(form);
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
        await documentTypesApi.toggleActive(id);
        fetchTypes();
    } catch (err) { alert(err.message); }
  };

  const openModal = (type = null) => {
    if (type) {
      setEditType(type);
      setForm({
        name: type.name,
        description: type.description,
        is_required: !!type.is_required,
      });
    } else {
      setEditType(null);
      setForm({ name: '', description: '', is_required: true });
    }
    setShowModal(true);
  };

  if (loading && !types.length) return <div className="loading-state"><div className="spinner" /><span>Loading requirements...</span></div>;

  return (
    <div className="manage-page">
      <div className="manage-page__header">
        <div>
            <h2 className="manage-page__title">Document Requirements</h2>
            <p className="manage-page__subtitle" style={{ fontSize: 'var(--text-label-md)', opacity: 0.7 }}>Define the documents interns must upload to complete their OJT.</p>
        </div>
        <button className="btn btn--primary" onClick={() => openModal()}>
          <FaPlus style={{ marginRight: '8px' }} /> Add Requirement
        </button>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
            <thead>
                <tr>
                    <th>Requirement Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {types.map(t => (
                    <tr key={t.document_type_id} style={{ opacity: t.is_active ? 1 : 0.6 }}>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}><FaFileAlt /></div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{t.description}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span className={`chip chip--${t.is_active ? 'success' : 'neutral'}`}>
                                {t.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <div className="manage-page__table-actions">
                                <button className="manage-page__action-btn" title="Edit" onClick={() => openModal(t)}><FaEdit /></button>
                                <button 
                                    className={`manage-page__action-btn ${t.is_active ? '' : 'manage-page__action-btn--danger'}`} 
                                    title={t.is_active ? 'Deactivate' : 'Activate'}
                                    onClick={() => handleToggleActive(t.document_type_id)}
                                >
                                    {t.is_active ? <FaToggleOn style={{ fontSize: '1.25rem' }} /> : <FaToggleOff style={{ fontSize: '1.25rem' }} />}
                                </button>
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
              <h3 className="modal__title">{editType ? 'Edit Requirement' : 'Add New Requirement'}</h3>
              <button className="btn btn--icon" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>
            <div className="modal__body">
              <form className="manage-page__form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-group__label">Requirement Name</label>
                  <input className="input" placeholder="e.g., Medical Certificate" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-group__label">Description</label>
                  <textarea className="input" rows="3" placeholder="Explain what the intern needs to upload..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-group__label">Required</label>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                      <input type="radio" name="is_required" checked={form.is_required === true} onChange={() => setForm({...form, is_required: true})} />
                      Mandatory
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                      <input type="radio" name="is_required" checked={form.is_required === false} onChange={() => setForm({...form, is_required: false})} />
                      Optional
                    </label>
                  </div>
                </div>
                <div className="modal__footer" style={{ padding: 0, marginTop: 'var(--space-6)' }}>
                  <button type="submit" className="btn btn--primary" disabled={formLoading}>
                      {formLoading ? 'Saving...' : 'Save Requirement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
