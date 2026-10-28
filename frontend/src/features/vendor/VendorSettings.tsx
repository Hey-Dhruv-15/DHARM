import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Camera, Truck, CheckCircle2 } from 'lucide-react';

export const VendorSettings: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [hubName, setHubName] = useState('Midwest Sorting & Cross-Dock Hub 4');
  const [dockDoor, setDockDoor] = useState('Bay 4 / Gate 12');
  const [scannerBeep, setScannerBeep] = useState(true);
  const [autoDebounceSec, setAutoDebounceSec] = useState(8);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Vendor Hub Operations Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure scanning hardware, dock door assignments, and duplicate debounce rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Vendor hub configurations saved!</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Sorting Hub Facility Name
          </label>
          <input
            type="text"
            value={hubName}
            onChange={e => setHubName(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Active Dock Door Assignment
          </label>
          <input
            type="text"
            value={dockDoor}
            onChange={e => setDockDoor(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Scanner Validation Preferences</span>
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="beep-check"
              checked={scannerBeep}
              onChange={e => setScannerBeep(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
            />
            <label htmlFor="beep-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Play audible success tone on verified barcode scan
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Duplicate Barcode Debounce Window (Seconds)
            </label>
            <input
              type="number"
              min="2"
              max="30"
              value={autoDebounceSec}
              onChange={e => setAutoDebounceSec(Number(e.target.value))}
              className="w-full sm:w-48 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Prevents duplicate scan counts when moving items rapidly past lens.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Save Hub Settings
          </button>
        </div>
      </form>
    </div>
  );
};
