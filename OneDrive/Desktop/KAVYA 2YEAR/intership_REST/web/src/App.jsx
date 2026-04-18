import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import UserManagement from './pages/UserManagement';
import AuditLog from './pages/AuditLog';
import Organization from './pages/Organization';
import Landing from './pages/Landing';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import Summary from './pages/Summary';
import Board from './pages/Board';
import CalendarView from './pages/CalendarView';
import GoogleMeet from './pages/GoogleMeet';

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected — all users */}
            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>
            } />

            {/* Protected — admin only */}
            <Route path="/summary" element={
              <ProtectedRoute adminOnly><AppLayout><Summary /></AppLayout></ProtectedRoute>
            } />
            <Route path="/board" element={
              <ProtectedRoute><AppLayout><Board /></AppLayout></ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute><AppLayout><CalendarView /></AppLayout></ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute adminOnly><AppLayout><Analytics /></AppLayout></ProtectedRoute>
            } />
            <Route path="/activity" element={
              <ProtectedRoute adminOnly><AppLayout><Activity /></AppLayout></ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute adminOnly><AppLayout><UserManagement /></AppLayout></ProtectedRoute>
            } />
            <Route path="/audit" element={
              <ProtectedRoute adminOnly><AppLayout><AuditLog /></AppLayout></ProtectedRoute>
            } />
            <Route path="/organization" element={
              <ProtectedRoute adminOnly><AppLayout><Organization /></AppLayout></ProtectedRoute>
            } />
            <Route path="/meets" element={
              <ProtectedRoute adminOnly><AppLayout><GoogleMeet /></AppLayout></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
