import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Building, MapPin, Mail, Phone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || 'Anusha S');
  const [email] = useState(user?.email || 'anusha.s2028@gmail.com');
  const [organization, setOrganization] = useState(user?.organization || 'BioMed Advanced Research Diagnostics');
  const [location, setLocation] = useState(user?.location || 'BioMed Campus Bay 2, Tech Park');
  const [dockInstructions, setDockInstructions] = useState('Deliver cold-chain bins directly to Clinical Storage Bay 2. Inspect tamper seals upon handover.');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Customer Organization Profile
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Authorized consignee receiving credentials and clinical dock delivery parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile and delivery instructions updated!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Contact Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Registered Email (Sign-in)
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-lg cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Hospital / Laboratory Organization
          </label>
          <input
            type="text"
            value={organization}
            onChange={e => setOrganization(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Physical Receiving Dock Address
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Consignment Handover Instructions for Courier
          </label>
          <textarea
            rows={3}
            value={dockInstructions}
            onChange={e => setDockInstructions(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};
