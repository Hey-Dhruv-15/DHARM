import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { RotateCcw, Camera, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ReturnCase } from '../../types';

export const VendorReturns: React.FC = () => {
  const { returns, updateReturnStatus } = useData();
  const { user } = useAuth();

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnCase | null>(returns[0] || null);
  const [status, setStatus] = useState<ReturnCase['status']>('Quarantined');
  const [quarantineLoc, setQuarantineLoc] = useState('Vendor Hub Quarantine Bay Q-4B');
  const [notes, setNotes] = useState('');

  const handleOpenModal = (r: ReturnCase) => {
    setSelectedReturn(r);
    setStatus(r.status);
    setQuarantineLoc(r.quarantineLocation || 'Vendor Hub Quarantine Bay Q-4B');
    setNotes(r.inspectionNotes || '');
    setInspectModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    updateReturnStatus(
      selectedReturn.id,
      status,
      notes,
      quarantineLoc,
      user?.name || 'Sinu Gunshetty'
    );

    setInspectModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Quarantine Holding & Customer Returns
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Inspect damaged units returned by clinical recipients. Goods are quarantined from active inventory.
        </p>
      </div>

      <div className="space-y-4">
        {returns.map(r => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-slate-900">
                    {r.returnNumber}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer: <strong className="text-slate-800">{r.customerName}</strong> • Original Shipment: <span className="font-mono text-indigo-600 font-bold">{r.trackingNumber}</span>
                </p>
              </div>

              <button
                onClick={() => handleOpenModal(r)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Log Physical Inspection
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Product & Quantity
                </span>
                <p className="font-bold text-slate-900 mt-0.5">{r.productName} ({r.quantity}x)</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Return Reason
                </span>
                <p className="font-bold text-rose-700 mt-0.5">{r.reason}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Isolation Location
                </span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{r.quarantineLocation || 'Pending Transfer'}</p>
              </div>
            </div>

            {r.inspectionNotes && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                <strong>Vendor Inspection Note:</strong> {r.inspectionNotes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedReturn && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Quarantine Inspection: ${selectedReturn.returnNumber}`}
          subtitle="Record technician notes and assign physical quarantine bin."
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ReturnCase['status'])}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Received at Hub">Received at Hub</option>
                <option value="Inspected">Inspected</option>
                <option value="Quarantined">Quarantined (Isolated)</option>
                <option value="Replacement Dispatched">Replacement Dispatched</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quarantine Bay
              </label>
              <input
                type="text"
                required
                value={quarantineLoc}
                onChange={e => setQuarantineLoc(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inspection Notes
              </label>
              <textarea
                rows={3}
                required
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Detail packaging seal integrity and leak status..."
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
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer"
              >
                Commit Quarantine Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
