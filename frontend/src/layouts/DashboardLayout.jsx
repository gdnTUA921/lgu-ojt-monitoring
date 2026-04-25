import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import { useAuth } from '../context/AuthContext';
import { authApi, notificationsApi, ASSET_URL } from '../services/api';
import { FaBars, FaBell, FaChevronDown, FaUserCog, FaSignOutAlt } from 'react-icons/fa';
import './DashboardLayout.css';

export default function DashboardLayout({ breadcrumb }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.user_type || 'intern';

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 2 minutes
    const interval = setInterval(fetchUnreadCount, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationsApi.unreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('auth_user'));
      // Only call API if we have a user ID to log the audit trail
      if (storedUser?.user_id) {
        await authApi.logout({ user_id: storedUser.user_id });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always logout locally regardless of API success
      logout();
      navigate('/login');
    }
  };

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : '??';

  return (
    <div className={`dashboard-layout ${mobileOpen ? 'dashboard-layout--open' : ''}`} id="dashboard-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((v) => !v)}
      />

      <div className="dashboard-layout__main">
        {/* Header */}
        <header className="dashboard-layout__header" id="dashboard-header">
          <div className="dashboard-layout__header-left">
            <button
              className="dashboard-layout__menu-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Sidebar"
              id="sidebar-toggle"
            >
              <FaBars />
            </button>
            {breadcrumb && (
              <span className="dashboard-layout__breadcrumb">{breadcrumb}</span>
            )}
          </div>

          <div className="dashboard-layout__header-right">
            {/* Notification Bell */}
            <button
              className="dashboard-layout__notif-btn"
              onClick={() => navigate(`/${role}/notifications`)}
              aria-label="Notifications"
              id="header-notifications"
            >
              <FaBell />
              {unreadCount > 0 && (
                <div className="dashboard-layout__notif-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="dashboard-layout__profile-wrap" ref={menuRef}>
              <button
                className={`dashboard-layout__profile-trigger ${showProfileMenu ? 'active' : ''}`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                id="profile-dropdown-trigger"
              >
                <div className="dashboard-layout__avatar-sm">
                  {user?.pfpic ? <img src={`${ASSET_URL}/${user.pfpic}`} alt="Profile" /> : initials}
                </div>
                <span className="dashboard-layout__profile-name">{user?.first_name}</span>
                <FaChevronDown className={`dashboard-layout__chevron ${showProfileMenu ? 'rotate' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="dashboard-layout__dropdown shadow-lg animate-in" id="profile-dropdown-menu">
                  <div className="dashboard-layout__dropdown-header">
                    <div className="dashboard-layout__dropdown-name">{user?.first_name} {user?.last_name}</div>
                    <div className="dashboard-layout__dropdown-role">{role}</div>
                  </div>
                  <div className="dashboard-layout__dropdown-divider" />
                  <Link to={`/${role}/profile`} className="dashboard-layout__dropdown-item" onClick={() => setShowProfileMenu(false)}>
                    <FaUserCog /> Profile Settings
                  </Link>
                  <button className="dashboard-layout__dropdown-item dashboard-layout__dropdown-item--danger" onClick={handleLogout}>
                    <FaSignOutAlt /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
