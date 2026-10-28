import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  CheckCircle2,
  FileText,
  Search,
  Camera,
  Sparkles,
  Plus
} from 'lucide-react';
import type { DiscrepancyCase, DiscrepancyStatus, DiscrepancySeverity, DiscrepancyType } from '../../types';

export const OwnerDiscrepancies: React.FC = () => {
  const { discrepancies, shipments, products, updateDiscrepancyStatus, reportDiscrepancy } = useData();
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, _setSeverityFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<DiscrepancyCase | null>(discrepancies[0] || null);
  const [newlyCreatedCaseId, setNewlyCreatedCaseId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ number: string; tracking: string } | null>(null);

  // Report Exception Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [type, setType] = useState<DiscrepancyType>('Damaged Goods');
  const [severity, setSeverity] = useState<DiscrepancySeverity>('Medium');
  const [expectedQty, setExpectedQty] = useState(1);
  const [observedQty, setObservedQty] = useState(0);
  const [notes, setNotes] = useState('');

  // Handle incoming routing from scanner (e.g., Report Damaged button in Image 1)
  useEffect(() => {
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
    } | null;

    if (state?.openReportModal) {
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

      setReportModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, shipments, products, navigate, location.pathname]);

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
        detectionStage: 'Owner Packing',
        detectedBy: `${user?.name || 'Dhruva'} (Owner)`,
        evidence: [
          {
            id: `evd-${Date.now()}`,
            type: 'Photo',
            description: notes || 'Physical damage / packaging defect identified during verification scanning. Unit quarantined.',
            timestamp: new Date().toISOString(),
            uploadedBy: user?.name || 'Dhruva'
          }
        ],
        resolutionNotes: 'Flagged during packing verification. Product quarantined from active batch.'
      },
      user?.name || 'Dhruva',
      role || 'OWNER'
    );

    setSelectedCase(newCase);
    setNewlyCreatedCaseId(newCase.id);
    setSuccessBanner({
      number: newCase.discrepancyNumber,
      tracking: shipment ? shipment.trackingNumber : selectedShipmentId
    });
    setReportModalOpen(false);
    setNotes('');
  };

  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<DiscrepancyStatus>('Resolved');
  const [resolutionOutcome, setResolutionOutcome] = useState<DiscrepancyCase['resolutionOutcome']>('Approved Replacement');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleOpenResolveModal = (c: DiscrepancyCase) => {
    setSelectedCase(c);
    setTargetStatus(c.status === 'Resolved' ? 'Under Review' : 'Resolved');
    setResolutionNotes(c.resolutionNotes || '');
    setResolveModalOpen(true);
  };

  const handleSaveResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    updateDiscrepancyStatus(
      selectedCase.id,
      targetStatus,
      resolutionNotes,
      resolutionOutcome,
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    // Update local selection
    setSelectedCase(prev =>
      prev ? { ...prev, status: targetStatus, resolutionNotes, resolutionOutcome } : null
    );

    setResolveModalOpen(false);
  };

  const filtered = discrepancies.filter(d => {
    const matchSearch =
      d.discrepancyNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.shipmentTracking.toLowerCase().includes(search.toLowerCase()) ||
      (d.productName && d.productName.toLowerCase().includes(search.toLowerCase())) ||
      d.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchSev = severityFilter === 'ALL' || d.severity === severityFilter;
    return matchSearch && matchStatus && matchSev;
  });

  const statuses: ('ALL' | DiscrepancyStatus)[] = [
    'ALL',
    'Detected',
    'Under Review',
    'Evidence Collected',
    'Resolution Proposed',
    'Resolved',
    'Escalated'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-red-100 text-red-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Core Differentiating Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Intelligent Discrepancy & Loss Prevention Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time reconciliation of expected vs verified quantities, photographic evidence collection, and resolution workflows.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
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
                Damaged unit for shipment <span className="font-mono font-bold">{successBanner.tracking}</span> has been quarantined and recorded into the exceptions registry.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Discrepancy ID, tracking, SKU, or exception type..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Lifecycle:
          </span>
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Left List, Right Detailed Investigation Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Discrepancy Cards List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filtered.map(c => {
            const isSelected = selectedCase?.id === c.id;
            const isJustAdded = c.id === newlyCreatedCaseId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-400 shadow-sm'
                    : isJustAdded
                    ? 'bg-amber-50/80 border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {c.discrepancyNumber}
                      </span>
                      {isJustAdded && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider uppercase">
                          New
                        </span>
                      )}
                      <StatusBadge status={c.severity} size="sm" />
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {c.type}: {c.productName || 'Uncataloged Item'}
                    </h4>

                    <p className="text-xs text-slate-500">
                      Shipment: <span className="font-mono text-indigo-600 font-semibold">{c.shipmentTracking}</span>
                    </p>
                  </div>

                  <StatusBadge status={c.status} size="sm" />
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-rose-600">
                    Delta: {c.observedQuantity} observed / {c.expectedQuantity} expected
                  </span>
                  <span>{new Date(c.detectedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
              <p className="font-semibold text-slate-700">No discrepancies found</p>
              <p className="text-xs">All scanned shipments in this filter are reconciled.</p>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Investigation Dossier (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6 sticky top-20">
              {/* Top Dossier Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-extrabold text-slate-900">
                      {selectedCase.discrepancyNumber}
                    </span>
                    <StatusBadge status={selectedCase.severity} />
                    <StatusBadge status={selectedCase.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Detected at stage: <strong className="text-slate-700">{selectedCase.detectionStage}</strong> by {selectedCase.detectedBy}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenResolveModal(selectedCase)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Update Status / Resolve
                </button>
              </div>

              {/* Lifecycle Visual Progress */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Lifecycle Progress
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                  {['Detected', 'Under Review', 'Evidence Collected', 'Resolution Proposed', 'Resolved'].map((st, idx) => {
                    const stepOrder = ['Detected', 'Under Review', 'Evidence Collected', 'Resolution Proposed', 'Resolved'];
                    const currentIdx = stepOrder.indexOf(selectedCase.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = selectedCase.status === st;

                    return (
                      <div
                        key={st}
                        className={`p-1.5 rounded-lg border transition ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {st}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantification Comparison Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Expected Qty
                  </span>
                  <p className="text-lg font-extrabold text-slate-900">
                    {selectedCase.expectedQuantity}
                  </p>
                </div>

                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <span className="text-[10px] font-semibold text-red-500 uppercase">
                    Observed Qty
                  </span>
                  <p className="text-lg font-extrabold text-red-700">
                    {selectedCase.observedQuantity}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Container
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800 truncate mt-1">
                    {selectedCase.containerNumber || 'None'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Investigator
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate mt-1">
                    {selectedCase.assignedInvestigator || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* Supporting Evidence Vault */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Evidence & Audit Logs ({selectedCase.evidence.length})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {selectedCase.evidence.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px]">
                            {ev.type}
                          </span>
                          <span>Uploaded by {ev.uploadedBy}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Notes & Outcome Section */}
              <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Investigation Findings & Resolution
                  </h4>
                  {selectedCase.resolutionOutcome && (
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs">
                      Outcome: {selectedCase.resolutionOutcome}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedCase.resolutionNotes || 'No notes filed yet. Case is currently under active review.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700">Select a discrepancy from the left to view dossier</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Update Status / Resolve Discrepancy */}
      {selectedCase && (
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title={`Update Case: ${selectedCase.discrepancyNumber}`}
          subtitle={`Managing discrepancy for ${selectedCase.productName || selectedCase.type}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveResolution} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lifecycle State
              </label>
              <select
                value={targetStatus}
                onChange={e => setTargetStatus(e.target.value as DiscrepancyStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Detected">Detected (Newly recorded)</option>
                <option value="Under Review">Under Review (Investigator assigned)</option>
                <option value="Evidence Collected">Evidence Collected (Photos & logs filed)</option>
                <option value="Resolution Proposed">Resolution Proposed (Action plan ready)</option>
                <option value="Resolved">Resolved (Case formally closed)</option>
                <option value="Escalated">Escalated (Executive / Claims review)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolution Outcome
              </label>
              <select
                value={resolutionOutcome}
                onChange={e => setResolutionOutcome(e.target.value as DiscrepancyCase['resolutionOutcome'])}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Approved Replacement">Approved Replacement (Ship new unit to customer)</option>
                <option value="Inventory Adjusted">Inventory Adjusted (Reconcile physical stock loss)</option>
                <option value="Found in Other Container">Found in Other Container (Cross-dock misplacement solved)</option>
                <option value="Supplier Credit">Supplier Credit (Vendor / Carrier liability claim)</option>
                <option value="Pending">Pending further warehouse search</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Investigation Notes & Remediation Action
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Detail the root cause, search results, or credit issuance details..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
              >
                Commit Case Update
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Report Shipment Exception / Damage (Image 2) */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
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
              onClick={() => setReportModalOpen(false)}
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
