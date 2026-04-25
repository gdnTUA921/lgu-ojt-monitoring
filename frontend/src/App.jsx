import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

/* Layouts */
import DashboardLayout from './layouts/DashboardLayout';

/* Pages */
import Login from './pages/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import UserManagement from './pages/UserManagement/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement/DepartmentManagement';
import TimeLogs from './pages/TimeLogs/TimeLogs';
import DocumentManagement from './pages/DocumentManagement/DocumentManagement';
import Notifications from './pages/Notifications/Notifications';
import ProfileSettings from './pages/ProfileSettings/ProfileSettings';
import SupervisorDashboard from './pages/SupervisorDashboard/SupervisorDashboard';
import InternDashboard from './pages/InternDashboard/InternDashboard';
import AuditLogs from './pages/AuditLogs/AuditLogs';
import RequirementSettings from './pages/RequirementSettings/RequirementSettings';
import ManageInterns from './pages/ManageInterns/ManageInterns';
import InternManagement from './pages/InternManagement/InternManagement';
import SupervisorActivities from './pages/SupervisorActivities/SupervisorActivities';
import InternActivities from './pages/InternActivities/InternActivities';

/* ── Route Guard ──────────────────────────── */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    const fallback = {
      admin: '/admin/dashboard',
      supervisor: '/supervisor/dashboard',
      intern: '/intern/dashboard',
    };
    return <Navigate to={fallback[user.user_type] || '/login'} replace />;
  }

  return children;
}

/* ── Public Route Guard ───────────────────── */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    const fallback = {
      admin: '/admin/dashboard',
      supervisor: '/supervisor/dashboard',
      intern: '/intern/dashboard',
    };
    return <Navigate to={fallback[user.user_type] || '/'} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="interns" element={<InternManagement />} />
        <Route path="departments" element={<DepartmentManagement />} />
        <Route path="timelogs" element={<TimeLogs mode="admin" />} />
        <Route path="requirements" element={<RequirementSettings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Supervisor Routes */}
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="interns" element={<ManageInterns />} />
        <Route path="activities" element={<SupervisorActivities />} />
        <Route path="timelogs" element={<TimeLogs mode="supervisor" />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Intern Routes */}
      <Route
        path="/intern"
        element={
          <ProtectedRoute allowedRoles={['intern']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InternDashboard />} />
        <Route path="timelogs" element={<TimeLogs mode="intern" />} />
        <Route path="activities" element={<InternActivities />} />
        <Route path="documents" element={<DocumentManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
