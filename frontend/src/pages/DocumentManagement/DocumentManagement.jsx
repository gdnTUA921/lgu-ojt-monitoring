import { useState, useEffect } from 'react';
import { documentsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaCheck, FaTimes, FaHistory, FaInfoCircle } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function DocumentManagement() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await documentsApi.getInternRequirements(user?.intern_id);
      setRequirements(data.requirements || data || []);
    } catch {
      // Demo Data
      setRequirements([
        { document_type_id: 1, name: 'Resume / CV', description: 'Latest professional curriculum vitae.', is_required: true, status: 'approved', verified_at: '2026-03-22 10:00:00' },
        { document_type_id: 2, name: 'Memorandum of Agreement', description: 'Standard MOA signed by the university and LGU.', is_required: true, status: 'pending', verified_at: null },
        { document_type_id: 3, name: 'Endorsement Letter', description: 'Official endorsement from the Dean of Studies.', is_required: true, status: 'rejected', verified_at: null },
        { document_type_id: 4, name: 'Medical Certificate', description: 'Clearance for work from a licensed physician.', is_required: false, status: 'missing', verified_at: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const config = {
      approved: { class: 'success', text: 'Approved', icon: <FaCheck /> },
      pending: { class: 'warning', text: 'Pending Verification', icon: <FaHistory /> },
      rejected: { class: 'error', text: 'Needs Correction', icon: <FaTimes /> },
      missing: { class: 'neutral', text: 'Not Submitted', icon: <FaInfoCircle /> }
    };
    const res = config[status] || config.missing;
    return <span className={`chip chip--${res.class}`} style={{ gap: '4px' }}>{res.icon} {res.text}</span>;
  };

  const formatDate = (dt) => {
    if (!dt) return '---';
    return new Date(dt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading && !requirements.length) return <div className="loading-state"><div className="spinner" /><span>Checking documents...</span></div>;

  return (
    <div className="manage-page">
      <div className="manage-page__header">
        <h2 className="manage-page__title">My Requirements Checklist</h2>
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Status</th>
              <th>Verified On</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map(req => (
              <tr key={req.document_type_id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{req.name}</div>
                  {req.description && <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>{req.description}</div>}
                  <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px', color: req.is_required ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {req.is_required ? 'MANDATORY' : 'OPTIONAL'}
                  </div>
                </td>
                <td>
                  {getStatusChip(req.status)}
                </td>
                <td>{formatDate(req.verified_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
