import { useState, useEffect } from 'react';
import { auditLogsApi } from '../../services/api';
import { FaSearch, FaFilter, FaHistory, FaUser, FaDesktop, FaGlobe } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total_items: 0 });

  useEffect(() => {
    fetchLogs();
  }, [filterModule, filterDate, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditLogsApi.list({
        module: filterModule || undefined,
        date_from: filterDate || undefined,
        page: currentPage,
        limit: 20
      });
      setLogs(data.logs || []);
      setPagination(data.pagination || { total_pages: 1, total_items: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
      const term = search.toLowerCase();
      return (
          log.user_name?.toLowerCase().includes(term) ||
          log.action?.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term)
      );
  });

  if (loading && !logs.length) {
    return <div className="loading-state"><div className="spinner" /><span>Loading audit logs...</span></div>;
  }

  return (
    <div className="manage-page" id="audit-logs-page">
      <div className="manage-page__header">
        <h2 className="manage-page__title">System Audit Logs</h2>
        <p className="manage-page__subtitle" style={{ fontSize: 'var(--text-body-sm)', opacity: 0.7 }}>Track all administrative and system actions for accountability.</p>
      </div>

      <div className="manage-page__filters">
        <div className="manage-page__search">
          <span className="manage-page__search-icon"><FaSearch /></span>
          <input 
            className="input" 
            placeholder="Search by user or action..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
          />
        </div>
        
        <select 
          className="manage-page__filter-select" 
          value={filterModule} 
          onChange={(e) => { setFilterModule(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Modules</option>
          <option value="AUTH">Authentication</option>
          <option value="USERS">Users</option>
          <option value="TIMELOGS">Time Logs</option>
          <option value="DOCUMENTS">Documents</option>
          <option value="DEPARTMENTS">Departments</option>
        </select>
 
        <input 
          type="date" 
          className="input" 
          style={{ maxWidth: '180px' }} 
          value={filterDate}
          onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="manage-page__table-wrap">
        <table className="manage-page__table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Module/Action</th>
              <th>Details</th>
              <th>Origin</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.log_id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 500 }}>{log.created_at.split(' ')[0]}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{log.created_at.split(' ')[1]}</div>
                </td>
                <td>
                    <div className="manage-page__user-cell">
                        <div>
                            <div className="manage-page__user-name">{log.user_name}</div>
                            <div className="manage-page__user-email">{log.user_email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span className={`chip chip--neutral`} style={{ fontWeight: 600, fontSize: '10px' }}>{log.module}</span>
                    <div style={{ marginTop: '4px', fontWeight: 500, fontSize: '13px' }}>{log.action}</div>
                </td>
                <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>{log.details}</div>
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: 0.7 }}>
                        <FaGlobe title="IP Address" /> {log.ip_address}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', opacity: 0.5 }}>
                <FaHistory style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }} />
                <p>No audit logs found for the current filters.</p>
            </div>
        )}
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
    </div>
  );
}
