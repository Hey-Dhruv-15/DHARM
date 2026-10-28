import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onMobileMenuOpen: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onMobileMenuOpen
}) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive human-readable page name from path
  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Overview Dashboard';
    if (p.includes('/order') && !p.includes('/orders')) return 'Place Order';
    if (p.includes('/orders')) return 'Order History';
    if (p.includes('/verify')) return 'Product Traceability & QR Verification';
    if (p.includes('/notifications')) return 'Notifications & Custody Feed';
    if (p.includes('/products/new')) return 'Register New Product';
    if (p.includes('/products')) return 'Product & SKU Catalog';
    if (p.includes('/containers')) return 'Containers & Tamper Seals';
    if (p.includes('/shipments/outgoing')) return 'Outbound Deliveries';
    if (p.includes('/shipments')) return 'Shipment Manifests';
    if (p.includes('/scanner')) return 'QR & Barcode Scanner Engine';
    if (p.includes('/discrepancies')) return 'Discrepancy Resolution Engine';
    if (p.includes('/inventory')) return 'Inventory Ledger';
    if (p.includes('/returns')) return 'Returns & Replacements Hub';
    if (p.includes('/analytics')) return 'Logistics KPIs & Analytics';
    if (p.includes('/audit-log')) return 'Cryptographic Audit Trail';
    if (p.includes('/issues')) return 'Report Delivery Issue';
    if (p.includes('/profile')) return 'Account Profile';
    if (p.includes('/settings')) return 'System Settings';
    return 'Logistics Portal';
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <span>DHARM</span>
            <span>/</span>
            <span className="text-indigo-600 font-bold">{role}</span>
          </div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: User Profile & Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User avatar and logout button */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
            {user?.name?.[0] || 'U'}
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-slate-700">
            {user?.name || 'Dhruva'}
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
