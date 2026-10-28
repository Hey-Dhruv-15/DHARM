import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldAlert,
  ArrowRight,
  Package,
  Layers
} from 'lucide-react';
import type { ReturnCase } from '../../types';

export const OwnerReturns: React.FC = () => {
  const { returns, updateReturnStatus } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnCase | null>(returns[0] || null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ReturnCase['status']>('Inspected');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [quarantineLocation, setQuarantineLocation] = useState('Vendor Hub Quarantine Bay Q-4B');

  const handleOpenInspect = (ret: ReturnCase) => {
    setSelectedReturn(ret);
    setTargetStatus(ret.status);
    setInspectionNotes(ret.inspectionNotes || '');
    setQuarantineLocation(ret.quarantineLocation || 'Quarantine Holding Bay Q-4B');
    setInspectModalOpen(true);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    updateReturnStatus(
      selectedReturn.id,
      targetStatus,
      inspectionNotes,
      quarantineLocation,
      user?.name || 'Dhruva (Owner)'
    );

    setSelectedReturn(prev =>
      prev
        ? {
            ...prev,
            status: targetStatus,
            inspectionNotes,
            quarantineLocation
          }
        : null
    );

    setInspectModalOpen(false);
  };

  const filtered = returns.filter(
    r =>
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Returns, Replacements & Quarantine Custody
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Customer return inspections, damaged goods quarantine isolation, and replacement tracking.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Returns List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search returns by ID, customer, or SKU..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          {filtered.map(r => {
            const isSelected = selectedReturn?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReturn(r)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-400 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {r.returnNumber}
                      </span>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {r.productName} (Qty: {r.quantity})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Customer: <span className="font-semibold text-slate-700">{r.customerName}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                    Reason: {r.reason}
                  </span>
                  <span>{new Date(r.requestedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 7 Cols: Return Case Dossier */}
        <div className="lg:col-span-7">
          {selectedReturn ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6 sticky top-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-extrabold text-slate-900">
                      {selectedReturn.returnNumber}
                    </span>
                    <StatusBadge status={selectedReturn.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Original Shipment:{' '}
                    <span className="font-mono font-bold text-indigo-600">
                      {selectedReturn.trackingNumber}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => handleOpenInspect(selectedReturn)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Update Quarantine / Status
                </button>
              </div>

              {/* Quarantine Rule Highlight Notice */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Strict Quarantine Isolation Protocol</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Returned items are automatically held in Quarantine Bay and NEVER returned to available inventory until formal inspection and reconciliation approval.
                  </p>
                </div>
              </div>

              {/* Details Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Customer & Facility
                  </span>
                  <p className="font-bold text-slate-900">{selectedReturn.customerName}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Return Reason
                  </span>
                  <p className="font-bold text-rose-700">{selectedReturn.reason}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Quarantine Bay
                  </span>
                  <p className="font-bold font-mono text-slate-800">
                    {selectedReturn.quarantineLocation || 'Pending Hub Receipt'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Replacement Shipment
                  </span>
                  <p className="font-bold font-mono text-emerald-700">
                    {selectedReturn.replacementShipmentId || 'Awaiting Inspection'}
                  </p>
                </div>
              </div>

              {/* Inspection Notes */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Technical Inspection Log
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {selectedReturn.inspectionNotes || 'Unit pending arrival at vendor sorting hub for technical moisture / seal check.'}
                </div>
              </div>

              {/* Evidence Photos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer Damage Evidence</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedReturn.evidencePhotos.map((photo, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={photo} alt="Return Evidence" className="w-full h-32 object-cover" />
                      <div className="p-2 text-[10px] text-slate-500 font-medium">
                        Photo #{i + 1} filed by Customer at handover
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700">Select a return request to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Update Return Status */}
      {selectedReturn && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Quarantine & Inspection: ${selectedReturn.returnNumber}`}
          subtitle="Record technician inspection outcome and adjust quarantine storage."
          maxWidth="md"
        >
          <form onSubmit={handleSaveInspection} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Return Case Status
              </label>
              <select
                value={targetStatus}
                onChange={e => setTargetStatus(e.target.value as ReturnCase['status'])}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Requested">Requested (Awaiting pickup)</option>
                <option value="Pickup Scheduled">Pickup Scheduled</option>
                <option value="Received at Hub">Received at Hub (Awaiting bay transfer)</option>
                <option value="Inspected">Inspected (Damage verified)</option>
                <option value="Quarantined">Quarantined (Secured in isolation bin)</option>
                <option value="Replacement Dispatched">Replacement Dispatched</option>
                <option value="Closed">Closed (Claim complete)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quarantine Physical Holding Location
              </label>
              <input
                type="text"
                required
                value={quarantineLocation}
                onChange={e => setQuarantineLocation(e.target.value)}
                placeholder="e.g. Vendor Hub Quarantine Bay Q-4B"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Technician Inspection Findings
              </label>
              <textarea
                rows={3}
                required
                value={inspectionNotes}
                onChange={e => setInspectionNotes(e.target.value)}
                placeholder="Detail damage inspection, seal tampering, or warranty credit validity..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
              >
                Update Return Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
