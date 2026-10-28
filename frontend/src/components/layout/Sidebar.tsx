import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Box,
  Archive,
  Truck,
  ScanLine,
  AlertTriangle,
  Layers,
  RotateCcw,
  BarChart3,
  FileText,
  Settings,
  Send,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen,
  onMobileClose
}) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  const getNavLinks = () => {
    if (role === 'OWNER') {
      return [
        { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/owner/products', label: 'Products & SKUs', icon: Box },
        { to: '/owner/containers', label: 'Containers', icon: Archive },
        { to: '/owner/shipments', label: 'Shipments & Manifests', icon: Truck },
        { to: '/owner/scanner', label: 'QR/Barcode Scanner', icon: ScanLine, highlight: true },
        { to: '/owner/discrepancies', label: 'Discrepancy Engine', icon: AlertTriangle, badge: '2' },
        { to: '/owner/inventory', label: 'Master Inventory', icon: Layers },
        { to: '/owner/returns', label: 'Returns & Replacements', icon: RotateCcw },
        { to: '/owner/analytics', label: 'Logistics Analytics', icon: BarChart3 },
        { to: '/owner/audit-log', label: 'Audit Trail', icon: FileText },
        { to: '/owner/settings', label: 'Settings', icon: Settings }
      ];
    } else if (role === 'VENDOR') {
      return [
        { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/vendor/shipments', label: 'Incoming Shipments', icon: Truck },
        { to: '/vendor/scanner', label: 'Receipt Scanner', icon: ScanLine, highlight: true },
        { to: '/vendor/discrepancies', label: 'Exceptions & Damaged', icon: AlertTriangle, badge: '1' },
        { to: '/vendor/inventory', label: 'Hub Stock', icon: Layers },
        { to: '/vendor/shipments/outgoing', label: 'Outgoing Deliveries', icon: Send },
        { to: '/vendor/returns', label: 'Quarantine & Returns', icon: RotateCcw },
        { to: '/vendor/settings', label: 'Settings', icon: Settings }
      ];
    } else {
      // CUSTOMER
      return [
        { to: '/customer/dashboard', label: 'My Deliveries', icon: LayoutDashboard },
        { to: '/customer/shipments', label: 'Order History', icon: Truck },
        { to: '/customer/issues', label: 'Report a Problem', icon: HelpCircle },
        { to: '/customer/returns', label: 'Return Requests', icon: RotateCcw },
        { to: '/customer/profile', label: 'Account Profile', icon: Settings }
      ];
    }
  };

  const navLinks = getNavLinks();

  const roleStyles = {
    OWNER: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      tag: 'Product Owner'
    },
    VENDOR: {
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      tag: 'Vendor Logistics Hub'
    },
    CUSTOMER: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      tag: 'Verified Customer'
    }
  };

  const currentRoleStyle = role ? roleStyles[role] : roleStyles.OWNER;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b1120] text-slate-300 border-r border-slate-800/80 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Top Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/logo.svg" alt="DHARM" className="w-9 h-9 shrink-0 rounded-xl" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">
                  DHARM
                </span>
                <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-1">
                  Traceability ERP
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Role Identity Tag */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Active Perspective
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentRoleStyle.badge}`}
              >
                {role}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
              {currentRoleStyle.tag}
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isLinkActive = location.pathname === link.to || (link.to !== '/owner/dashboard' && link.to !== '/vendor/dashboard' && link.to !== '/customer/dashboard' && location.pathname.startsWith(link.to));

            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onMobileClose}
                className={() =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isLinkActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : link.highlight
                      ? 'text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
                title={collapsed ? link.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isLinkActive ? 'text-white' : link.highlight ? 'text-indigo-400' : 'text-slate-400 group-hover:scale-110'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{link.label}</span>
                )}
                {!collapsed && link.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {link.badge}
                  </span>
                )}
                {!collapsed && isLinkActive && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* System Trust & Security Footer */}
        {!collapsed && (
          <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographic Audit Mode</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Every barcode scan & handover is hashed to an immutable log.
            </p>
          </div>
        )}

        {/* User Card & Logout Bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {user?.name}
                  </div>
                  <div className="text-[10.5px] text-slate-400 truncate">
                    {user?.organization}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
