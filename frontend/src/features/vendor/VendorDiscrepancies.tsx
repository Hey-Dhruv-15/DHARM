import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ShieldAlert,
  RotateCcw,
  Warehouse,
  Eye,
  ArrowRight,
  Package,
  Layers,
  UserCheck,
  Building,
  User,
  Clock
} from 'lucide-react';
import type { DiscrepancyCase, DiscrepancyType, DiscrepancySeverity, DiscrepancyStatus } from '../../types';

export const VendorDiscrepancies: React.FC = () => {
  const navigate = useNavigate();
  const { discrepancies, shipments, products, reportDiscrepancy, updateDiscrepancyStatus } = useData();
  const { user, role } = useAuth();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'CUSTOMER_REPORTED' | 'DAMAGED' | 'UNDER_REVIEW'>('ALL');

  // Vendor Action / Investigation Modal State
  const [selectedCase, setSelectedCase] = useState<DiscrepancyCase | null>(null);
  const [investigateModalOpen, setInvestigateModalOpen] = useState(false);
  const [vendorQuarantineBay, setVendorQuarantineBay] = useState('Vendor Hub Quarantine Bay Q-4B');
  const [targetStatus, setTargetStatus] = useState<DiscrepancyStatus>('Under Review');
  const [vendorNotes, setVendorNotes] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Report Exception Modal State (Vendor-initiated)
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<DiscrepancyType>('Damaged Goods');
  const [severity, setSeverity] = useState<DiscrepancySeverity>('Medium');
  const [expectedQty, setExpectedQty] = useState(1);
  const [observedQty, setObservedQty] = useState(0);
  const [reportNotes, setReportNotes] = useState('');

  // Counts for Tabs
  const customerReportedCount = useMemo(() => {
    return discrepancies.filter(d => d.detectionStage === 'Customer Handover' || Boolean(d.orderNumber) || d.detectedBy.toLowerCase().includes('customer') || d.detectedBy.toLowerCase().includes('anusha')).length;
  }, [discrepancies]);

  const damagedCount = useMemo(() => {
    return discrepancies.filter(d => d.type === 'Damaged Goods').length;
  }, [discrepancies]);

  const underReviewCount = useMemo(() => {
    return discrepancies.filter(d => d.status !== 'Resolved').length;
  }, [discrepancies]);

  // Filtering
  const filtered = useMemo(() => {
    let list = [...discrepancies];

    if (filterTab === 'CUSTOMER_REPORTED') {
      list = list.filter(d => d.detectionStage === 'Customer Handover' || Boolean(d.orderNumber) || d.detectedBy.toLowerCase().includes('customer') || d.detectedBy.toLowerCase().includes('anusha'));
    } else if (filterTab === 'DAMAGED') {
      list = list.filter(d => d.type === 'Damaged Goods');
    } else if (filterTab === 'UNDER_REVIEW') {
      list = list.filter(d => d.status !== 'Resolved');
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        d =>
          d.discrepancyNumber.toLowerCase().includes(q) ||
          d.shipmentTracking.toLowerCase().includes(q) ||
          (d.orderNumber && d.orderNumber.toLowerCase().includes(q)) ||
          (d.customerName && d.customerName.toLowerCase().includes(q)) ||
          (d.productName && d.productName.toLowerCase().includes(q)) ||
          d.type.toLowerCase().includes(q) ||
          (d.resolutionNotes && d.resolutionNotes.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime());
    return list;
  }, [discrepancies, filterTab, search]);

  const handleOpenInvestigate = (c: DiscrepancyCase) => {
    setSelectedCase(c);
    setTargetStatus(c.status);
    setVendorNotes(c.resolutionNotes || '');
    setVendorQuarantineBay('Vendor Hub Quarantine Bay Q-4B');
    setActionSuccessMsg(null);
    setInvestigateModalOpen(true);
  };

  const handleSaveInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const fullNote = vendorNotes.trim()
      ? `${vendorNotes.trim()} [Quarantine Assigned: ${vendorQuarantineBay}]`
      : `Inspected by Vendor Logistics (${user?.name || 'Sinu Gunshetty'}). Assigned to ${vendorQuarantineBay}.`;

    updateDiscrepancyStatus(
      selectedCase.id,
      targetStatus,
      fullNote,
      selectedCase.resolutionOutcome || 'Pending',
      user?.name || 'Sinu Gunshetty (Vendor)',
      'VENDOR'
    );

    setActionSuccessMsg(`Updated case #${selectedCase.discrepancyNumber} to ${targetStatus}.`);
    setTimeout(() => {
      setInvestigateModalOpen(false);
      setActionSuccessMsg(null);
    }, 1500);
  };

  const handleCreateVendorReport = (e: React.FormEvent) => {
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
            description: reportNotes || 'Physical inspection noted exception at dock arrival.',
            timestamp: new Date().toISOString(),
            uploadedBy: user?.name || 'Sinu Gunshetty'
          }
        ],
        resolutionNotes: 'Flagged by vendor dock inspection. Awaiting QA review.'
      },
      user?.name || 'Sinu Gunshetty',
      role || 'VENDOR'
    );

    setReportModalOpen(false);
    setReportNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Carrier Hub Exception & Reverse Logistics Custody
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Exceptions & Damaged Goods
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time feed of customer damage reports, dock shipment discrepancies, and quarantine custody management.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Report Hub Exception</span>
        </button>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exceptions by Case #, Order #, Customer, Tracking, or SKU..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Exceptions ({discrepancies.length})
            </button>

            <button
              onClick={() => setFilterTab('CUSTOMER_REPORTED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterTab === 'CUSTOMER_REPORTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Customer Reports ({customerReportedCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('DAMAGED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterTab === 'DAMAGED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Damaged Goods ({damagedCount})
            </button>

            <button
              onClick={() => setFilterTab('UNDER_REVIEW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterTab === 'UNDER_REVIEW'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Under Review ({underReviewCount})
            </button>
          </div>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Case # & Origin</th>
                <th className="py-3.5 px-4">Order & Customer</th>
                <th className="py-3.5 px-4">Deliverable & SKU</th>
                <th className="py-3.5 px-4">Problem Category</th>
                <th className="py-3.5 px-4">Defect Units</th>
                <th className="py-3.5 px-4">Customer Notes / Description</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(d => {
                const isCustomerReported =
                  d.detectionStage === 'Customer Handover' ||
                  Boolean(d.orderNumber) ||
                  d.detectedBy.toLowerCase().includes('customer') ||
                  d.detectedBy.toLowerCase().includes('anusha');

                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition">
                    {/* Case # & Origin */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-mono font-extrabold text-slate-900">
                        {d.discrepancyNumber}
                      </div>
                      <div className="mt-1">
                        {isCustomerReported ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            <User className="w-2.5 h-2.5" />
                            Customer Report
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Building className="w-2.5 h-2.5" />
                            In-Hub Dock Scan
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Order & Customer */}
                    <td className="py-3.5 px-4 align-top">
                      {d.orderNumber ? (
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {d.orderNumber}
                        </div>
                      ) : (
                        <div className="font-mono text-slate-500 text-xs">
                          {d.shipmentTracking}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate max-w-[150px]">
                        {d.customerName || 'BioMed Advanced Research'}
                      </div>
                    </td>

                    {/* Deliverable & SKU */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 max-w-[170px] truncate">
                        {d.productName || 'Diagnostic Supplies'}
                      </div>
                      <div className="text-[10px] font-mono text-indigo-600">
                        {d.sku || 'SKU-UNKNOWN'}
                      </div>
                    </td>

                    {/* Problem Category */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-rose-700">
                        {d.type}
                      </div>
                      <div className="mt-0.5">
                        <StatusBadge status={d.severity} size="sm" />
                      </div>
                    </td>

                    {/* Defect Units */}
                    <td className="py-3.5 px-4 align-top font-mono">
                      <span className="font-bold text-rose-600">
                        {d.observedQuantity} Defective
                      </span>
                      <div className="text-[10px] text-slate-400">
                        of {d.expectedQuantity} ordered
                      </div>
                    </td>

                    {/* Customer Notes / Description */}
                    <td className="py-3.5 px-4 align-top max-w-[200px]">
                      <p className="text-xs text-slate-700 line-clamp-2 italic">
                        {d.resolutionNotes || d.evidence?.[0]?.description || 'No additional note provided.'}
                      </p>
                      {d.preferredResolution && (
                        <div className="text-[10px] font-bold text-indigo-700 mt-1">
                          Requested: {d.preferredResolution}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 align-top">
                      <StatusBadge status={d.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        onClick={() => handleOpenInvestigate(d)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-xs sm:text-sm">No exceptions matching filter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">All customer deliveries and dock consignments reconciled.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Investigate & Action Discrepancy (Vendor Workspace) */}
      {selectedCase && (
        <Modal
          isOpen={investigateModalOpen}
          onClose={() => setInvestigateModalOpen(false)}
          title={`Exception Investigation: ${selectedCase.discrepancyNumber}`}
          subtitle={`Reported for Order ${selectedCase.orderNumber || selectedCase.shipmentTracking} • Consignee: ${selectedCase.customerName}`}
          maxWidth="2xl"
        >
          {actionSuccessMsg ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-900 text-sm">{actionSuccessMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSaveInvestigation} className="space-y-4">
              {/* Customer Filing Brief Card */}
              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                  <span className="font-extrabold text-rose-950 uppercase text-[10px] tracking-wider">
                    Customer Problem Report Details
                  </span>
                  <span className="font-bold text-rose-700">
                    {new Date(selectedCase.detectedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Order Ref:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedCase.orderNumber || 'Direct'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Customer:</span>
                    <span className="font-bold text-slate-900">{selectedCase.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Category:</span>
                    <span className="font-bold text-rose-700">{selectedCase.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Defective Count:</span>
                    <span className="font-mono font-bold text-rose-600">{selectedCase.observedQuantity} of {selectedCase.expectedQuantity}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-slate-400 block text-[10px]">Customer Observations & Notes:</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    {selectedCase.resolutionNotes || 'No description entered.'}
                  </p>
                </div>

                {selectedCase.preferredResolution && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-bold bg-indigo-50 p-2 rounded-xl border border-indigo-200">
                    <span>Customer Preferred Resolution:</span>
                    <span className="text-indigo-700">{selectedCase.preferredResolution}</span>
                  </div>
                )}
              </div>

              {/* Vendor Operational Actions Form */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Vendor Hub Handling & Quarantine Allocation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Update Exception Status
                    </label>
                    <select
                      value={targetStatus}
                      onChange={e => setTargetStatus(e.target.value as DiscrepancyStatus)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="Evidence Collected">Evidence Collected (At Hub)</option>
                      <option value="Resolution Proposed">Resolution Proposed (Replacement Prepared)</option>
                      <option value="Resolved">Resolved (Handled & Closed)</option>
                      <option value="Escalated">Escalated to Product Owner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assign Quarantine Isolation Bay
                    </label>
                    <input
                      type="text"
                      value={vendorQuarantineBay}
                      onChange={e => setVendorQuarantineBay(e.target.value)}
                      placeholder="e.g. Vendor Hub Quarantine Bay Q-4B"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Technician Inspection Note
                  </label>
                  <textarea
                    rows={2}
                    value={vendorNotes}
                    onChange={e => setVendorNotes(e.target.value)}
                    placeholder="Record technician inspection findings, physical box state, tamper seal status, and quarantine bin transfer..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setInvestigateModalOpen(false);
                    navigate('/vendor/returns');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>Open Quarantine & Returns Bay →</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvestigateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save & Update Status
                  </button>
                </div>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Modal: Vendor Dock Exception Reporting */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Shipment Exception / Damage"
        subtitle="Submit photographic evidence and discrepancy logs to Product Owner."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateVendorReport} className="space-y-4">
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
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              placeholder="Describe physical damage, broken seals, or packing bench context..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Submit Discrepancy
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
