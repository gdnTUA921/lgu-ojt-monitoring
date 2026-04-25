import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ASSET_URL } from '../../services/api';
import {
  FaThLarge,
  FaUsers,
  FaBuilding,
  FaClock,
  FaFileAlt,
  FaClipboardCheck,
  FaBell,
  FaUserCog,
  FaGraduationCap,
  FaChartLine,
  FaIdCard,
  FaBars,
  FaTimes,
  FaHistory,
  FaCogs,
  FaClipboardList
} from 'react-icons/fa';
import './Sidebar.css';

const Icons = {
  dashboard: () => <span className="sidebar__nav-icon"><FaThLarge /></span>,
  users: () => <span className="sidebar__nav-icon"><FaUsers /></span>,
  departments: () => <span className="sidebar__nav-icon"><FaBuilding /></span>,
  timelogs: () => <span className="sidebar__nav-icon"><FaClock /></span>,
  documents: () => <span className="sidebar__nav-icon"><FaFileAlt /></span>,
  requirements: () => <span className="sidebar__nav-icon"><FaCogs /></span>,
  notifications: () => <span className="sidebar__nav-icon"><FaBell /></span>,
  profile: () => <span className="sidebar__nav-icon"><FaUserCog /></span>,
  audit: () => <span className="sidebar__nav-icon"><FaHistory /></span>,
  interns: () => <span className="sidebar__nav-icon"><FaGraduationCap /></span>,
  progress: () => <span className="sidebar__nav-icon"><FaChartLine /></span>,
  virtualId: () => <span className="sidebar__nav-icon"><FaIdCard /></span>,
  activities: () => <span className="sidebar__nav-icon"><FaClipboardList /></span>,
};

const NAV_CONFIG = {
  admin: {
    theme: 'admin',
    sections: [
      {
        label: 'Main',
        items: [
          { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { to: '/admin/users', label: 'User Management', icon: 'users' },
          { to: '/admin/interns', label: 'Interns', icon: 'interns' },
          { to: '/admin/departments', label: 'Departments', icon: 'departments' },
        ],
      },
      {
        label: 'Monitoring',
        items: [
          { to: '/admin/timelogs', label: 'Time Logs', icon: 'timelogs' },
          { to: '/admin/requirements', label: 'Requirement Settings', icon: 'requirements' },
        ],
      },
      {
        label: 'System',
        items: [
          { to: '/admin/notifications', label: 'Notifications', icon: 'notifications' },
          { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'audit' },
          { to: '/admin/profile', label: 'Settings', icon: 'profile' },
        ],
      },
    ],
  },
  supervisor: {
    theme: 'admin',
    sections: [
      {
        label: 'Overview',
        items: [
          { to: '/supervisor/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { to: '/supervisor/interns', label: 'My Interns', icon: 'interns' },
          { to: '/supervisor/activities', label: 'Activities', icon: 'activities' },
        ],
      },
      {
        label: 'Monitoring',
        items: [
          { to: '/supervisor/timelogs', label: 'Time Logs', icon: 'timelogs' },
        ],
      },
      {
        label: 'System',
        items: [
          { to: '/supervisor/notifications', label: 'Notifications', icon: 'notifications' },
          { to: '/supervisor/profile', label: 'Settings', icon: 'profile' },
        ],
      },
    ],
  },
  intern: {
    theme: 'admin',
    sections: [
      {
        label: 'My Internship',
        items: [
          { to: '/intern/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { to: '/intern/timelogs', label: 'Time Logs', icon: 'timelogs' },
          { to: '/intern/activities', label: 'Activities', icon: 'activities' },
          { to: '/intern/documents', label: 'My Requirements', icon: 'documents' },
        ],
      },
      {
        label: 'System',
        items: [
          { to: '/intern/notifications', label: 'Notifications', icon: 'notifications' },
          { to: '/intern/profile', label: 'Settings', icon: 'profile' },
        ],
      },
    ],
  },
};

export default function Sidebar({ mobileOpen, onToggleMobile }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.user_type || 'intern';
  const config = NAV_CONFIG[role] || NAV_CONFIG.intern;
  const theme = config.theme;

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : '??';

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar__overlay ${mobileOpen ? 'sidebar__overlay--visible' : ''}`}
        onClick={onToggleMobile}
      />

      <aside
        className={`sidebar sidebar--${theme} ${mobileOpen ? 'sidebar--open' : ''}`}
        id="main-sidebar"
      >
        {/* Logo */}
        <div className="sidebar__header" id="sidebar-header">
          <div className="sidebar__logo-wrap">
            <div className="sidebar__logo-icon">LGU</div>
            <div>
              <div className="sidebar__logo-text">OJT Monitor</div>
              <div className="sidebar__logo-tagline">Mandaluyong City</div>
            </div>
          </div>
          <button
            className="sidebar__close-btn"
            onClick={onToggleMobile}
            aria-label="Close Sidebar"
            id="sidebar-close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {config.sections.map((section) => (
            <div key={section.label}>
              <div className="sidebar__section-label">{section.label}</div>
              {section.items.map((item) => {
                const IconComponent = Icons[item.icon];
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                    }
                    id={`nav-${item.icon}`}
                  >
                    {IconComponent && <IconComponent />}
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user?.pfpic ? <img src={`${ASSET_URL}/${user.pfpic}`} alt="Profile" /> : initials}
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="sidebar__user-role">{role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
