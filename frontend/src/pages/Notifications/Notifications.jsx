import { useState, useEffect } from 'react';
import { notificationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaBell, FaCheckDouble, FaCircle } from 'react-icons/fa';
import '../../styles/manage-page.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead(user?.user_id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  return (
    <div className="manage-page" id="notifications-page">
      <div className="manage-page__header">
        <h2 className="manage-page__title">Notifications</h2>
        <button className="btn btn--ghost" id="mark-all-read" onClick={handleMarkAllRead}>
          <FaCheckDouble style={{ marginRight: '8px' }} /> Mark all read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.notification_id} 
              className="card" 
              onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', 
                opacity: n.is_read ? 0.7 : 1, cursor: n.is_read ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: n.is_read ? 'transparent' : 'rgba(var(--color-primary-rgb), 0.05)'
              }}
            >
              {n.is_read ? <FaBell style={{ color: 'var(--color-on-surface-variant)' }} /> : <FaCircle style={{ color: 'var(--color-primary)', fontSize: '10px' }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)' }}>
            <FaBell style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
            <p>No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
