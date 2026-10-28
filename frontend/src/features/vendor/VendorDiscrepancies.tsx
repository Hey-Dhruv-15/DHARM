import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CustomerDamagedReports } from './CustomerDamagedReports';
import {
  Plus,
  CheckCircle2,
  Search,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import type { DiscrepancyType, DiscrepancySeverity } from '../../types';

export const VendorDiscrepancies: React.FC = () => {
  const { discrepancies, shipments, products, returns, reportDiscrepancy } = useData();
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'dock-discrepancies' | 'customer-damaged'>('dock-discrepancies');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newlyCreatedCaseId, setNewlyCreatedCaseId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ number: string; tracking: string } | null>(null);

  // Report Form State
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<DiscrepancyType>('Damaged Goods');
  const [severity, setSeverity] = useState<DiscrepancySeverity>('Medium');
  const [expectedQty, setExpectedQty] = useState(1);
  const [observedQty, setObservedQty] = useState(0);
  const [notes, setNotes] = useState('');

  // Handle incoming routing from scanner (e.g., Report Damaged button in Image 1) or customer damaged tab
  useEffect(() => {
    if (
      location.pathname.includes('customer-damaged') ||
      location.search.includes('customer-damaged') ||
      (location.state as any)?.activeTab === 'customer-damaged'
    ) {
      setActiveTab('customer-damaged');
    }

    const state = location.state as {
      openReportModal?: boolean;
      shipmentId?: string;
      productId?: string;
      sku?: string;
      type?: DiscrepancyType;
      severity?: DiscrepancySeverity;
      expectedQty?: number;
      observedQty?: number;
      notes?: string;
      activeTab?: 'dock-discrepancies' | 'customer-damaged';
    } | null;

    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }

    if (state?.openReportModal) {
      setActiveTab('dock-discrepancies');

      if (state.shipmentId && shipments.some(s => s.id === state.shipmentId)) {
        setSelectedShipmentId(state.shipmentId);
      } else if (shipments.length > 0) {
        setSelectedShipmentId(shipments[0].id);
      }

      if (state.productId && products.some(p => p.id === state.productId)) {
        setSelectedProductId(state.productId);
      } else if (state.sku) {
        const found = products.find(p => p.sku === state.sku);
        if (found) setSelectedProductId(found.id);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }

      if (state.type) {
        setType(state.type);
      } else {
        setType('Damaged Goods');
      }

      if (state.severity) {
        setSeverity(state.severity);
      } else {
        setSeverity('Medium');
      }

      if (typeof state.expectedQty === 'number') {
        setExpectedQty(state.expectedQty);
      } else {
        setExpectedQty(1);
      }

      if (typeof state.observedQty === 'number') {
        setObservedQty(state.observedQty);
      } else {
        setObservedQty(0);
      }

      if (typeof state.notes === 'string') {
        setNotes(state.notes);
      }

      setModalOpen(true);

      // Clean up navigation state in history so reload doesn't trigger modal again
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, location.search, shipments, products, navigate]);

  const handleShipmentChange = (shipId: string) => {
    setSelectedShipmentId(shipId);
    const shp = shipments.find(s => s.id === shipId);
    if (shp && shp.items.length > 0) {
      const firstItem = shp.items[0];
      const prod = products.find(p => p.id === firstItem.productId || p.sku === firstItem.sku);
      if (prod) {
        setSelectedProductId(prod.id);
        setExpectedQty(firstItem.expectedQuantity);
        setObservedQty(0);
      }
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const shp = shipments.find(s => s.id === selectedShipmentId);
    const item = shp?.items.find(i => i.productId === prodId);
    if (item) {
      setExpectedQty(item.expectedQuantity);
    }
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    const shipment = shipments.find(s => s.id === selectedShipmentId);
    const product = products.find(p => p.id === selectedProductId);

    const newCase = reportDiscrepancy(
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
            description: notes || 'Physical damage / packaging defect identified during verification scanning. Unit quarantined.',
            timestamp: new Date().toISOString(),
            uploadedBy: user?.name || 'Sinu Gunshetty'
          }
        ],
        resolutionNotes: 'Flagged by vendor inspection. Awaiting Owner review.'
      },
      user?.name || 'Sinu Gunshetty',
      role || 'VENDOR'
    );

    setNewlyCreatedCaseId(newCase.id);
    setSuccessBanner({
      number: newCase.discrepancyNumber,
      tracking: shipment ? shipment.trackingNumber : selectedShipmentId
    });
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
      {/* Top Module Segment Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('dock-discrepancies')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'dock-discrepancies'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${activeTab === 'dock-discrepancies' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Dock Barcode & Receiving Damaged</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {discrepancies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customer-damaged')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'customer-damaged'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${activeTab === 'customer-damaged' ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Customer Damaged Reports & Resolution</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {returns.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'customer-damaged' ? (
        <CustomerDamagedReports />
      ) : (
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

          {/* Success Notification Banner when discrepancy added */}
          {successBanner && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    Exception Case <span className="font-mono text-emerald-950 font-extrabold">{successBanner.number}</span> Successfully Logged!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Damaged unit for shipment <span className="font-mono font-bold">{successBanner.tracking}</span> has been quarantined and recorded into the exceptions table below.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by Case #, Shipment Tracking, SKU, or exception type..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Discrepancies Table (Image 3) */}
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
                  {filtered.map(d => {
                    const isJustAdded = d.id === newlyCreatedCaseId;
                    return (
                      <tr
                        key={d.id}
                        className={`transition duration-300 ${
                          isJustAdded
                            ? 'bg-amber-50/80 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          <div className="flex items-center gap-1.5">
                            <span>{d.discrepancyNumber}</span>
                            {isJustAdded && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider uppercase">
                                New
                              </span>
                            )}
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Report Shipment Exception / Damage (Image 2) */}
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
                    onChange={e => handleShipmentChange(e.target.value)}
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
                    onChange={e => handleProductChange(e.target.value)}
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
                    <option value="Damaged Goods">Damaged Goods (Cracked / Seal Broken)</option>
                    <option value="Missing Item">Missing Item (Manifested but not scanned)</option>
                    <option value="Unexpected Product">Unexpected Product (Barcode not on manifest)</option>
                    <option value="Duplicate Scan">Duplicate Scan Attempt</option>
                    <option value="Wrong Container">Wrong Container (Mismatched bin ID)</option>
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
      )}
    </div>
  );
};
