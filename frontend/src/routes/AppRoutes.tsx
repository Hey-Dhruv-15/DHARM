import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from './UnauthorizedPage';

// Owner Pages
import { OwnerDashboard } from '../features/owner/OwnerDashboard';
import { OwnerProducts } from '../features/owner/OwnerProducts';
import { OwnerProductCreate } from '../features/owner/OwnerProductCreate';
import { OwnerContainers } from '../features/owner/OwnerContainers';
import { OwnerShipments } from '../features/owner/OwnerShipments';
import { OwnerDiscrepancies } from '../features/owner/OwnerDiscrepancies';
import { OwnerInventory } from '../features/owner/OwnerInventory';
import { OwnerReturns } from '../features/owner/OwnerReturns';
import { OwnerAnalytics } from '../features/owner/OwnerAnalytics';
import { OwnerAuditLog } from '../features/owner/OwnerAuditLog';
import { OwnerSettings } from '../features/owner/OwnerSettings';

// Vendor Pages
import { VendorDashboard } from '../features/vendor/VendorDashboard';
import { VendorShipments } from '../features/vendor/VendorShipments';
import { VendorDiscrepancies } from '../features/vendor/VendorDiscrepancies';
import { VendorInventory } from '../features/vendor/VendorInventory';
import { VendorOutgoing } from '../features/vendor/VendorOutgoing';
import { VendorSettings } from '../features/vendor/VendorSettings';

// Customer Pages
import { CustomerDashboard } from '../features/customer/CustomerDashboard';
import { CustomerOrder } from '../features/customer/CustomerOrder';
import { CustomerOrders } from '../features/customer/CustomerOrders';
import { CustomerShipments } from '../features/customer/CustomerShipments';
import { CustomerIssues } from '../features/customer/CustomerIssues';
import { CustomerReturns } from '../features/customer/CustomerReturns';
import { CustomerProfile } from '../features/customer/CustomerProfile';

// Scanner Component
import { QrBarcodeScanner } from '../components/scanner/QrBarcodeScanner';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated || !role) return '/login';
    if (role === 'OWNER') return '/owner/dashboard';
    if (role === 'VENDOR') return '/vendor/dashboard';
    return '/customer/dashboard';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <LoginPage />
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Owner Protected Routes */}
      <Route element={<AppLayout allowedRoles={['OWNER']} />}>
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/products" element={<OwnerProducts />} />
        <Route path="/owner/products/new" element={<OwnerProductCreate />} />
        <Route path="/owner/containers" element={<OwnerContainers />} />
        <Route path="/owner/shipments" element={<OwnerShipments />} />
        <Route path="/owner/shipments/new" element={<OwnerShipments />} />
        <Route
          path="/owner/scanner"
          element={
            <QrBarcodeScanner
              title="Owner Dispatch Verification & Container Packing Scanner"
            />
          }
        />
        <Route path="/owner/discrepancies" element={<OwnerDiscrepancies />} />
        <Route path="/owner/inventory" element={<OwnerInventory />} />
        <Route path="/owner/returns" element={<OwnerReturns />} />
        <Route path="/owner/analytics" element={<OwnerAnalytics />} />
        <Route path="/owner/audit-log" element={<OwnerAuditLog />} />
        <Route path="/owner/settings" element={<OwnerSettings />} />
      </Route>

      {/* Vendor Protected Routes */}
      <Route element={<AppLayout allowedRoles={['VENDOR']} />}>
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path="/vendor/shipments" element={<VendorShipments />} />
        <Route path="/vendor/shipments/:id" element={<VendorShipments />} />
        <Route
          path="/vendor/scanner"
          element={
            <QrBarcodeScanner
              title="Vendor Hub Arrival & Cross-Dock Receipt Scanner"
            />
          }
        />
        <Route path="/vendor/discrepancies" element={<VendorDiscrepancies />} />
        <Route path="/vendor/customer-damaged" element={<Navigate to="/vendor/discrepancies" replace />} />
        <Route path="/vendor/returns" element={<Navigate to="/vendor/discrepancies" replace />} />
        <Route path="/vendor/inventory" element={<VendorInventory />} />
        <Route path="/vendor/shipments/outgoing" element={<VendorOutgoing />} />
        <Route path="/vendor/settings" element={<VendorSettings />} />
      </Route>

      {/* Customer Protected Routes */}
      <Route element={<AppLayout allowedRoles={['CUSTOMER']} />}>
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/order" element={<CustomerOrder />} />
        <Route path="/customer/orders" element={<CustomerOrders />} />
        <Route path="/customer/shipments" element={<CustomerShipments />} />
        <Route path="/customer/shipments/:id" element={<CustomerShipments />} />
        <Route path="/customer/issues" element={<CustomerIssues />} />
        <Route path="/customer/returns" element={<CustomerReturns />} />
        <Route path="/customer/profile" element={<CustomerProfile />} />
      </Route>

      {/* Root & Catch-all */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
    </Routes>
  );
};
