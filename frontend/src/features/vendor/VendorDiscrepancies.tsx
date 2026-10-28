import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  AlertTriangle,
  Plus,
  Camera,
  Search,
  CheckCircle2,
  FileText,
  ShieldAlert
} from 'lucide-react';
import type { DiscrepancyType, DiscrepancySeverity } from '../../types';

export const VendorDiscrepancies: React.FC = () => {
  const { discrepancies, shipments, products, reportDiscrepancy } = useData();
  const { user, role } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Report Form State
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<DiscrepancyType>('Damaged Goods');
  const [severity, setSeverity] = useState<DiscrepancySeverity>('Medium');
  const [expectedQty, setExpectedQty] = useState(1);
  const [observedQty, setObservedQty] = useState(0);
  const [notes, setNotes] = useState('');

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    const shipment = shipments.find(s => s.id === selectedShipmentId);
    const product = products.find(p => p.id === selectedProductId);

    reportDiscrepancy(
      {
        shipmentId: selectedShipmentId,
        shipmentTracking: shipment ? shipment.trackingNumber : 'TRK-UNKNOWN',
        containerId: shipment?.containerIds[0] || 'cnt-01',
        containerNumber: 'CNT-ALPHA-881',
        productId: product?.id,
        productName: product?.name,
        sku: product?.sku,
        type,
        severity,
        status: 'Detected',
        expectedQuantity: Number(expectedQty),
        observedQuantity: Number(observedQty),
        detectionStage: 'Vendor Receiving',
        detectedBy: `${user?.name || 'Sinu Gunshetty'} (Vendor)`,
        evidence: [
          {
            id: `evd-${Date.now()}`,
            type: 'Photo',
            description: notes || 'Physical inspection noted exception at dock arrival.',
            timestamp: new Date().toISOString(),
            uploadedBy: user?.name || 'Sinu Gunshetty'
          }
        ],
        resolutionNotes: 'Flagged by vendor inspection. Awaiting Owner review.'
      },
      user?.name || 'Sinu Gunshetty',
      role || 'VENDOR'
    );

    setModalOpen(false);
    setNotes('');
  };

  const filtered = discrepancies.filter(
    d =>
      d.discrepancyNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.shipmentTracking.toLowerCase().includes(search.toLowerCase()) ||
      (d.productName && d.productName.toLowerCase().includes(search.toLowerCase())) ||
      d.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Vendor Discrepancy & Damage Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Log physical exceptions, missing units, damaged seals, and unexpected unmanifested items.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Report Exception</span>
        </button>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Shipment</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Exception Type</th>
                <th className="py-3 px-4">Expected vs Observed</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Resolution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                    {d.discrepancyNumber}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {d.shipmentTracking}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{d.productName || 'Unspecified SKU'}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{d.sku}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {d.type}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-500 font-normal">{d.expectedQuantity} exp</span>
                    <span className="mx-1">/</span>
                    <span className="font-bold text-rose-600">{d.observedQuantity} obs</span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={d.severity} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report Discrepancy */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Report Shipment Exception / Damage"
        subtitle="Submit photographic evidence and discrepancy logs to Product Owner."
        maxWidth="lg"
      >
        <form onSubmit={handleReport} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Shipment
              </label>
              <select
                value={selectedShipmentId}
                onChange={e => setSelectedShipmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.trackingNumber} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Product SKU
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Discrepancy Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as DiscrepancyType)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Missing Item">Missing Item (Manifested but not scanned)</option>
                <option value="Unexpected Product">Unexpected Product (Barcode not on manifest)</option>
                <option value="Duplicate Scan">Duplicate Scan Attempt</option>
                <option value="Wrong Container">Wrong Container (Mismatched bin ID)</option>
                <option value="Damaged Goods">Damaged Goods (Cracked / Seal Broken)</option>
                <option value="Quantity Mismatch">Quantity Mismatch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as DiscrepancySeverity)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Low">Low (Informational)</option>
                <option value="Medium">Medium (Operational delay)</option>
                <option value="High">High (Missing high-value unit)</option>
                <option value="Critical">Critical (Immediate containment)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Units
              </label>
              <input
                type="number"
                min="0"
                value={expectedQty}
                onChange={e => setExpectedQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observed Physical Units
              </label>
              <input
                type="number"
                min="0"
                value={observedQty}
                onChange={e => setObservedQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Inspection Evidence Notes
            </label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe physical damage, broken seals, or packing bench context..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
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
              className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Submit Discrepancy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
