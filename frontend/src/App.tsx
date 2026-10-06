import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui/Spinner';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PetsListPage } from './pages/pets/PetsListPage';
import { PetDetailPage } from './pages/pets/PetDetailPage';
import { LinkQRPage } from './pages/qr-wizard/LinkQRPage';
import { StorePage } from './pages/store/StorePage';
import { AccountPage } from './pages/account/AccountPage';
import { PublicQRScanPage } from './pages/public-scan/PublicQRScanPage';
import { AdminVouchersPage } from './pages/admin/AdminVouchersPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner label="Verificando sesión segura..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Only Route (Redirects to dashboard if already authenticated)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Standalone QR Scan Page (No login required) */}
            <Route path="/qr/:code" element={<PublicQRScanPage />} />
            <Route path="/terminos" element={<TermsPage />} />
            <Route path="/privacidad" element={<PrivacyPage />} />

            {/* Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pets" element={<PetsListPage />} />
              <Route path="pets/:id" element={<PetDetailPage />} />
              <Route path="vincular-qr" element={<LinkQRPage />} />
              <Route path="cuenta" element={<AccountPage />} />
              <Route
                path="admin/vouchers"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminVouchersPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
