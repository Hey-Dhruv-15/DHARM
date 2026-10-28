import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Settings, Shield, Warehouse, Bell, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OwnerSettings: React.FC = () => {
  const { user } = useAuth();
  const { resetDemoData } = useData();

  const [saved, setSaved] = useState(false);
  const [hubName, setHubName] = useState('Central Distribution Center, Hub Alpha');
  const [autoLockManifest, setAutoLockManifest] = useState(true);
  const [tamperAlertThreshold, setTamperAlertThreshold] = useState('Immediate SMS + Push');
  const [reorderLeadDays, setReorderLeadDays] = useState(7);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          System Configuration & Logistics Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage product owner facility parameters, cryptographic seal policies, and automated alerts.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings successfully committed to system registry!</span>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            <span>Primary Dispatch Facility</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Distribution Hub Name
            </label>
            <input
              type="text"
              value={hubName}
              onChange={e => setHubName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discrepancy Notification SLA
              </label>
              <select
                value={tamperAlertThreshold}
                onChange={e => setTamperAlertThreshold(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Immediate SMS + Push">Immediate SMS + Push Notification</option>
                <option value="Hourly Digest">Hourly Consolidated Digest</option>
                <option value="Critical Only">Critical Severities Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Reorder Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                value={reorderLeadDays}
                onChange={e => setReorderLeadDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Seal Rules</span>
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autolock"
              checked={autoLockManifest}
              onChange={e => setAutoLockManifest(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="autolock" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Enforce SHA-256 seal locking before allowing shipment dispatch
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset entire system demo data to fresh initial seed?')) {
                resetDemoData();
                alert('Demo data reset to clean initial seed.');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
