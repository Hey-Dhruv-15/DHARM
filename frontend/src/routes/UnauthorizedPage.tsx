import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { role, switchRole, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Access Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your current account role (<strong className="text-slate-800">{role || 'GUEST'}</strong>) does not have authorization to view this internal ERP resource.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 text-left">
          <p className="font-bold text-slate-800">Quick Role Switch (Demo Mode):</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                switchRole('OWNER');
                navigate('/owner/dashboard');
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-[11px] font-bold text-slate-700 transition cursor-pointer"
            >
              👑 Owner
            </button>
            <button
              onClick={() => {
                switchRole('VENDOR');
                navigate('/vendor/dashboard');
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-[11px] font-bold text-slate-700 transition cursor-pointer"
            >
              🏢 Vendor
            </button>
            <button
              onClick={() => {
                switchRole('CUSTOMER');
                navigate('/customer/dashboard');
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-[11px] font-bold text-slate-700 transition cursor-pointer"
            >
              👤 Customer
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (role === 'OWNER') navigate('/owner/dashboard');
              else if (role === 'VENDOR') navigate('/vendor/dashboard');
              else if (role === 'CUSTOMER') navigate('/customer/dashboard');
              else navigate('/login');
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
