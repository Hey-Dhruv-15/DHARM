import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Archive,
  Plus,
  Shield,
  Weight,
  Lock,
  Unlock,
  Truck,
  Copy,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { Container } from '../../types';

export const OwnerContainers: React.FC = () => {
  const { containers, createContainer, shipments } = useData();
  const { user, role } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [containerNumber, setContainerNumber] = useState('');
  const [type, setType] = useState<Container['type']>('Cold-Chain Bin');
  const [sealNumber, setSealNumber] = useState('');
  const [capacityKg, setCapacityKg] = useState(150);
  const [location, setLocation] = useState('Central Warehouse Bay 4');

  const handleAutoFill = () => {
    const num = Math.floor(100 + Math.random() * 900);
    const prefix = type === 'Cold-Chain Bin' ? 'ALPHA' : type === 'RFID Pallet' ? 'PAL' : 'SEC';
    setContainerNumber(`CNT-${prefix}-${num}`);
    setSealNumber(`SEAL-TAMPER-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber || !sealNumber) {
      alert('Please provide container number and seal number.');
      return;
    }

    createContainer(
      {
        containerNumber: containerNumber.trim().toUpperCase(),
        type,
        sealNumber: sealNumber.trim().toUpperCase(),
        capacityKg: Number(capacityKg),
        location
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    setModalOpen(false);
    setContainerNumber('');
    setSealNumber('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Containers & Tamper-Evident Seals
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical bins, security crates, and RFID pallets assigned to shipments with tamper seals.
          </p>
        </div>

        <button
          onClick={() => {
            handleAutoFill();
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Container</span>
        </button>
      </div>

      {/* Containers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {containers.map(c => {
          const loadPercent = Math.min(100, Math.round((c.currentWeightKg / c.capacityKg) * 100));
          const assignedShipment = shipments.find(s => s.id === c.assignedShipmentId);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-indigo-600" />
                      <span className="font-mono text-base font-extrabold text-slate-900">
                        {c.containerNumber}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {c.type}
                    </span>
                  </div>

                  <StatusBadge status={c.status} size="sm" />
                </div>

                {/* Seal Info Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" /> Tamper Seal:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.sealNumber);
                        alert(`Copied seal "${c.sealNumber}" to clipboard!`);
                      }}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Copy Seal"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {c.sealNumber}
                  </div>
                </div>

                {/* Weight and Capacity Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Capacity Utilized:</span>
                    <span className="font-bold text-slate-800">
                      {c.currentWeightKg} kg / {c.capacityKg} kg ({loadPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        loadPercent > 90
                          ? 'bg-rose-500'
                          : loadPercent > 50
                          ? 'bg-indigo-600'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                </div>

                {/* Assigned Shipment & Location */}
                <div className="text-xs space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Shipment:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {assignedShipment ? assignedShipment.trackingNumber : 'None (Unassigned)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Location:</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                      {c.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Items Loaded:</span>
                    <span className="font-bold text-slate-800">
                      {c.itemCount} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.containerNumber);
                    alert(`Copied container ID "${c.containerNumber}" to clipboard!`);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </button>

                <span className="text-[11px] font-mono text-slate-400">
                  ID: {c.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Container */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Initialize New Transport Container"
        subtitle="Provision physical bin and assign tamper-evident seal number."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Container Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as Container['type'])}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Cold-Chain Bin">Cold-Chain Bin (Vaccines/Biologics)</option>
              <option value="Security Crate">Security Crate (High-Value Sensors)</option>
              <option value="RFID Pallet">RFID Pallet (Bulk Freight)</option>
              <option value="Standard Parcel">Standard Parcel (Express Box)</option>
              <option value="Heavy Duty Tote">Heavy Duty Tote (Reusable)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Container Number
              </label>
              <input
                type="text"
                required
                value={containerNumber}
                onChange={e => setContainerNumber(e.target.value)}
                placeholder="e.g. CNT-ALPHA-882"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Capacity (kg)
              </label>
              <input
                type="number"
                min="10"
                value={capacityKg}
                onChange={e => setCapacityKg(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tamper-Evident Seal ID
            </label>
            <input
              type="text"
              required
              value={sealNumber}
              onChange={e => setSealNumber(e.target.value)}
              placeholder="e.g. SEAL-SEC-99120"
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Warehouse Location
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Apex Central Depot Storage Bay 2"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
            >
              Create Container
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
