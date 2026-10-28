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
  PackageCheck,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Plus,
  Truck,
  Sparkles,
  ClipboardCheck,
  FileText,
  MapPin,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import type { ReturnCase, CustomerResolutionChoice } from '../../types';

export const CustomerDamagedReports: React.FC = () => {
  const {
    returns,
    shipments,
    products,
    inspectAndVerifyReturn,
    setCustomerReturnChoice,
    processReturnResolution,
    createReturnRequest
  } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [choiceFilter, setChoiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  // Modals
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [createClaimModalOpen, setCreateClaimModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnCase | null>(null);

  // Inspection Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [quarantineLoc, setQuarantineLoc] = useState('Vendor Hub Quarantine Bay Q-4B');

  // Choice Selection State
  const [selectedChoice, setSelectedChoice] = useState<CustomerResolutionChoice>('Replace Product');

  // Replacement Dispatch State
  const [replacementTracking, setReplacementTracking] = useState('');

  // Refund State
  const [refundRef, setRefundRef] = useState('');
  const [customRefundAmount, setCustomRefundAmount] = useState<number>(14500);

  // New Claim Form State
  const [newShipmentId, setNewShipmentId] = useState(shipments[0]?.id || '');
  const [newProductId, setNewProductId] = useState(products[0]?.id || '');
  const [newCustomerName, setNewCustomerName] = useState('Anusha S (BioMed Research Campus)');
  const [newReason, setNewReason] = useState<ReturnCase['reason']>('Damaged in Transit');
  const [newNotes, setNewNotes] = useState('');
  const [newChoice, setNewChoice] = useState<CustomerResolutionChoice>('Replace Product');

  // Success Notification
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Open Inspection Workbench
  const handleOpenInspect = (r: ReturnCase) => {
    setSelectedReturn(r);
    setDiagnosis(
      r.problemDiagnosis ||
      `Visual examination of returned package: ${r.reason} confirmed. Packaging seal broken.`
    );
    setInspectionNotes(
      r.inspectionNotes ||
      `Received at dock. Unit examined under verification bay lights. Physical damage quarantined immediately.`
    );
    setQuarantineLoc(r.quarantineLocation || 'Vendor Hub Quarantine Bay Q-4B');
    setInspectModalOpen(true);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    inspectAndVerifyReturn(
      selectedReturn.id,
      diagnosis,
      inspectionNotes,
      quarantineLoc,
      user?.name || 'Sinu Gunshetty (Vendor Quality Lead)'
    );

    setActionSuccess(`Physical inspection completed for claim ${selectedReturn.returnNumber}. Defect verified and quarantined.`);
    setInspectModalOpen(false);
  };

  // Open Choice Selector
  const handleOpenChoiceModal = (r: ReturnCase) => {
    setSelectedReturn(r);
    setSelectedChoice(r.customerChoice || 'Replace Product');
    setChoiceModalOpen(true);
  };

  const handleSaveChoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setCustomerReturnChoice(
      selectedReturn.id,
      selectedChoice,
      user?.name || 'Sinu Gunshetty (Vendor)'
    );

    setActionSuccess(`Customer resolution preference updated to "${selectedChoice}" for ${selectedReturn.returnNumber}.`);
    setChoiceModalOpen(false);
  };

  // Open Replacement Dispatch Modal
  const handleOpenReplacementModal = (r: ReturnCase) => {
    setSelectedReturn(r);
    setReplacementTracking(`TRK-REP-${Math.floor(10000 + Math.random() * 90000)}`);
    setReplacementModalOpen(true);
  };

  const handleConfirmReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    processReturnResolution(
      selectedReturn.id,
      'Replace Product',
      { replacementShipmentTracking: replacementTracking },
      user?.name || 'Sinu Gunshetty'
    );

    setActionSuccess(`Replacement shipment ${replacementTracking} dispatched for customer ${selectedReturn.customerName}.`);
    setReplacementModalOpen(false);
  };

  // Open Refund Modal
  const handleOpenRefundModal = (r: ReturnCase) => {
    setSelectedReturn(r);
    setRefundRef(`RFND-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    const prod = products.find(p => p.id === r.productId);
    const price = prod?.grossPrice ?? prod?.unitPrice ?? 14500;
    const calculatedAmount = price * r.quantity;
    setCustomRefundAmount(r.refundAmount || calculatedAmount);
    setRefundModalOpen(true);
  };

  const handleConfirmRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    processReturnResolution(
      selectedReturn.id,
      'Refund Amount',
      { refundReference: refundRef, refundAmount: customRefundAmount },
      user?.name || 'Sinu Gunshetty'
    );

    setActionSuccess(`Refund voucher ${refundRef} for ₹${customRefundAmount.toLocaleString()} authorized and processed for customer ${selectedReturn.customerName}.`);
    setRefundModalOpen(false);
  };

  // Create New Customer Damage Claim
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const ship = shipments.find(s => s.id === newShipmentId);
    const prod = products.find(p => p.id === newProductId);
    const basePrice = prod?.grossPrice ?? prod?.unitPrice ?? 14500;

    // Persist to backend PostgreSQL API
    try {
      await fetch('http://localhost:8000/api/returns/customer-damaged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: newShipmentId,
          tracking_number: ship ? ship.trackingNumber : 'TRK-UNKNOWN',
          product_id: prod?.id || 'prod-001',
          product_name: prod?.name || 'Sample Product',
          sku: prod?.sku || 'GEN-SKU',
          quantity: 1,
          customer_name: newCustomerName,
          customer_id: 'usr-cust-03',
          reason: newReason,
          desired_resolution: newChoice,
          notes: newNotes || 'Customer called in report of damaged unit upon arrival.'
        })
      });
    } catch (err) {
      console.warn('Backend API call note:', err);
    }

    const created = createReturnRequest(
      {
        originalShipmentId: newShipmentId,
        trackingNumber: ship ? ship.trackingNumber : 'TRK-UNKNOWN',
        customerId: 'usr-cust-03',
        customerName: newCustomerName,
        productId: prod?.id || 'prod-001',
        productName: prod?.name || 'Sample Product',
        sku: prod?.sku || 'GEN-SKU',
        quantity: 1,
        reason: newReason,
        evidencePhotos: ['/dharm_logistics_hero.jpg'],
        inspectionNotes: newNotes || 'Customer called in report of damaged unit upon arrival.',
        customerChoice: newChoice,
        refundAmount: basePrice,
        refundStatus: 'Pending',
        vendorVerified: false
      },
      user?.name || 'Sinu Gunshetty (Vendor)'
    );

    setActionSuccess(`Customer damage report ${created.returnNumber} created successfully.`);
    setCreateClaimModalOpen(false);
    setNewNotes('');
  };

  // Filter Claims
  const filtered = returns.filter(r => {
    const matchSearch =
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.sku && r.sku.toLowerCase().includes(search.toLowerCase()));

    const matchChoice =
      choiceFilter === 'ALL' ||
      (choiceFilter === 'Replace Product' && r.customerChoice === 'Replace Product') ||
      (choiceFilter === 'Refund Amount' && r.customerChoice === 'Refund Amount') ||
      (choiceFilter === 'Pending Choice' && !r.customerChoice);

    const matchStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter;

    return matchSearch && matchChoice && matchStatus;
  });

  // KPI Calculations
  const totalClaims = returns.length;
  const pendingInspection = returns.filter(r => !r.vendorVerified).length;
  const replaceCount = returns.filter(r => r.customerChoice === 'Replace Product').length;
  const refundCount = returns.filter(r => r.customerChoice === 'Refund Amount').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-rose-100 text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Customer Damage & Return Workflow
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Customer Damaged Product Claims & Resolution
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Inspect returned goods, diagnose reported transit defects, and fulfill customer resolution choices (Product Replacement or Refund).
          </p>
        </div>

        <button
          onClick={() => setCreateClaimModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Customer Claim</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active Damage Claims</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalClaims}</div>
          <span className="text-[11px] font-medium text-slate-400">Total customer return logs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Awaiting Physical Check</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ClipboardCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{pendingInspection}</div>
          <span className="text-[11px] font-medium text-slate-400">Requires vendor defect verification</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Choice: Replace Product</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">{replaceCount}</div>
          <span className="text-[11px] font-medium text-slate-400">Customer wants replacement unit</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Choice: Refund Amount</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-2">{refundCount}</div>
          <span className="text-[11px] font-medium text-slate-400">Customer wants credit/cash refund</span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold">{actionSuccess}</p>
            </div>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Return #, Customer Name, Tracking #, or SKU..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Customer Choice Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Customer Choice:
            </span>
            {['ALL', 'Replace Product', 'Refund Amount'].map(ch => (
              <button
                key={ch}
                onClick={() => setChoiceFilter(ch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  choiceFilter === ch
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ch === 'ALL' ? 'All Choices' : ch}
              </button>
            ))}
          </div>

          {/* View Mode Switcher: List View vs Cards */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Claims Display: List View vs Cards */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Claim Ref & Date</th>
                  <th className="py-3.5 px-4">Customer & Order</th>
                  <th className="py-3.5 px-4">Product / SKU</th>
                  <th className="py-3.5 px-4">Problem Reason</th>
                  <th className="py-3.5 px-4">Settlement Choice</th>
                  <th className="py-3.5 px-4">Physical Inspection & Quarantine</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map(r => {
                  const isVerified = r.vendorVerified;
                  const choice = r.customerChoice || 'Replace Product';
                  const isReplacementDispatched = r.status === 'Replacement Dispatched';
                  const isRefundProcessed = r.status === 'Refund Processed';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">
                          {r.returnNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(r.requestedAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900">{r.customerName}</div>
                        <div className="font-mono text-[11px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-indigo-400" />
                          <span>{r.trackingNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900">{r.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          SKU: {r.sku || 'N/A'} • <span className="font-semibold text-slate-700">{r.quantity} unit</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {r.reason}
                        </span>
                        <p className="text-[11px] text-slate-500 truncate mt-1" title={r.problemDiagnosis || r.inspectionNotes || ''}>
                          {r.problemDiagnosis || r.inspectionNotes || 'Damaged unit reported upon arrival.'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {choice === 'Replace Product' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Replace Product</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Refund Amount</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {isVerified ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Defect Verified</span>
                            </span>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{r.quarantineLocation || 'Quarantine Bay Q-4B'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Check Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <StatusBadge status={r.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenInspect(r)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title={isVerified ? 'Review Physical Inspection' : 'Inspect Defect'}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isVerified ? 'Inspected' : 'Inspect'}</span>
                          </button>

                          {choice === 'Replace Product' ? (
                            isReplacementDispatched ? (
                              <span className="px-2 py-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                                {r.replacementShipmentId || 'Dispatched'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenReplacementModal(r)}
                                disabled={!isVerified}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                title={isVerified ? 'Dispatch Replacement Unit' : 'Inspect First'}
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Dispatch</span>
                              </button>
                            )
                          ) : (
                            isRefundProcessed ? (
                              <span className="px-2 py-1 text-[11px] font-mono font-bold text-purple-700 bg-purple-50 rounded-lg border border-purple-200">
                                {r.refundReference || 'Refunded'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenRefundModal(r)}
                                disabled={!isVerified}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                title={isVerified ? 'Authorize & Issue Refund' : 'Inspect First'}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Refund</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
                      <h4 className="text-sm font-bold text-slate-800">No matching customer damage claims</h4>
                      <p className="text-xs mt-1">All customer return reports match current filter criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
        {filtered.map(r => {
          const isVerified = r.vendorVerified;
          const choice = r.customerChoice || 'Replace Product';
          const isReplacementDispatched = r.status === 'Replacement Dispatched';
          const isRefundProcessed = r.status === 'Refund Processed';

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {r.returnNumber}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                    {isVerified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Defect Checked & Verified</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Physical Check Pending</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Customer: <strong className="text-slate-800">{r.customerName}</strong> • Original Order:{' '}
                    <span className="font-mono font-semibold text-indigo-600">{r.trackingNumber}</span> • Reported on {new Date(r.requestedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Top Action Button: Physical Inspection */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    onClick={() => handleOpenInspect(r)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isVerified
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>{isVerified ? 'Review Physical Inspection' : 'Inspect & Check Problem'}</span>
                  </button>
                </div>
              </div>

              {/* Card Body - 3 Columns: Product & Problem / Vendor Assessment / Customer Choice & Action */}
              <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Col 1: Product & Customer Stated Problem (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Returned Product SKU
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{r.productName}</h4>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      SKU: {r.sku || 'N/A'} • Qty: <span className="font-bold text-slate-900">{r.quantity} unit</span>
                    </p>
                  </div>

                  <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                        Customer Reported Problem
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded">
                        {r.reason}
                      </span>
                    </div>
                    <p className="text-xs text-rose-950 font-medium leading-relaxed mt-1">
                      "{r.problemDiagnosis || r.inspectionNotes || 'Damaged packaging/unit observed by customer upon unboxing.'}"
                    </p>
                  </div>
                </div>

                {/* Col 2: Vendor Technical Physical Inspection (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-100 h-full flex flex-col justify-between bg-slate-50/40">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Vendor Defect Diagnostic
                        </span>
                        {isVerified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>

                      {isVerified ? (
                        <div className="space-y-2 mt-1 text-xs">
                          <p className="text-slate-800 font-semibold leading-relaxed">
                            {r.problemDiagnosis || 'Transit defect confirmed under bench inspection.'}
                          </p>
                          {r.inspectionNotes && (
                            <p className="text-slate-600 text-[11px] italic bg-white p-2 rounded-lg border border-slate-200/60">
                              Note: {r.inspectionNotes}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Isolation Bay: <strong className="font-mono text-slate-800">{r.quarantineLocation || 'Quarantine Bay Q-4B'}</strong></span>
                          </div>
                          {r.vendorVerifiedBy && (
                            <p className="text-[10px] text-slate-400">
                              Inspected by: {r.vendorVerifiedBy}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-center py-4 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2">
                          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                          <p className="text-xs font-bold text-amber-900">
                            Unit Returned — Needs Vendor Inspection
                          </p>
                          <p className="text-[11px] text-amber-700 px-2">
                            Check the product physically to verify customer defect claim before dispatching replacement or approving refund.
                          </p>
                          <button
                            onClick={() => handleOpenInspect(r)}
                            className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Inspect Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Col 3: Customer Choice & Resolution Engine (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border h-full flex flex-col justify-between ${
                      choice === 'Replace Product'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-purple-50/50 border-purple-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Customer Choice Preference
                        </span>
                        <button
                          onClick={() => handleOpenChoiceModal(r)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          Change Choice
                        </button>
                      </div>

                      {choice === 'Replace Product' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                            <PackageCheck className="w-4 h-4 text-emerald-600" />
                            <span>Replace Product</span>
                          </div>
                          <p className="text-xs text-emerald-800">
                            Customer elected to receive a brand-new identical unit dispatched to their facility.
                          </p>

                          {isReplacementDispatched ? (
                            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                              <span className="text-[10px] font-bold uppercase text-emerald-600">
                                Replacement In Transit
                              </span>
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{r.replacementShipmentId}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2">
                              <button
                                onClick={() => handleOpenReplacementModal(r)}
                                disabled={!isVerified}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Process Replacement Dispatch' : 'Inspect Defect to Dispatch'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span>Refund Amount</span>
                          </div>
                          <p className="text-xs text-purple-800">
                            Customer elected for full invoice credit refund of{' '}
                            <strong className="font-mono font-bold">
                              ₹{(r.refundAmount || 14500).toLocaleString()}
                            </strong>.
                          </p>

                          {isRefundProcessed ? (
                            <div className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs space-y-1">
                              <span className="text-[10px] font-bold uppercase text-purple-600">
                                Refund Credited
                              </span>
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                <span>{r.refundReference || 'RFND-2026-8819'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2">
                              <button
                                onClick={() => handleOpenRefundModal(r)}
                                disabled={!isVerified}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{isVerified ? 'Authorize & Issue Refund' : 'Inspect Defect to Refund'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-60" />
            <h4 className="text-base font-bold text-slate-800">No matching customer damage claims</h4>
            <p className="text-xs mt-1">All customer return reports match current filter criteria.</p>
          </div>
        )}
      </div>

      )}

      {/* MODAL 1: Vendor Physical Defect Inspection Workbench */}
      {selectedReturn && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Vendor Physical Inspection: ${selectedReturn.returnNumber}`}
          subtitle="Check the customer reported problem, examine physical unit, and quarantine from active stock."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveInspection} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-900">
                  {selectedReturn.productName} ({selectedReturn.quantity} unit)
                </span>
                <p className="text-slate-600">
                  Customer reported: <span className="font-medium text-rose-800">"{selectedReturn.problemDiagnosis || selectedReturn.inspectionNotes || selectedReturn.reason}"</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Defect Diagnosis & Physical Assessment
              </label>
              <textarea
                rows={2}
                required
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="E.g., Casing impact fracture verified. Internal vacuum compromised. Seal breach confirmed..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inspection Technician Notes
              </label>
              <textarea
                rows={2}
                value={inspectionNotes}
                onChange={e => setInspectionNotes(e.target.value)}
                placeholder="Diagnostic bench notes, packaging observations, handling recommendations..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Quarantine Isolation Bay
              </label>
              <input
                type="text"
                required
                value={quarantineLoc}
                onChange={e => setQuarantineLoc(e.target.value)}
                placeholder="Vendor Hub Quarantine Bay Q-4B"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Confirm Inspection & Quarantine</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Customer Resolution Choice Selector */}
      {selectedReturn && (
        <Modal
          isOpen={choiceModalOpen}
          onClose={() => setChoiceModalOpen(false)}
          title={`Set Customer Resolution Choice: ${selectedReturn.returnNumber}`}
          subtitle="Customer can select to replace the damaged product or receive a monetary refund."
          maxWidth="md"
        >
          <form onSubmit={handleSaveChoice} className="space-y-4">
            <div className="space-y-3">
              {/* Option 1: Replace Product */}
              <label
                onClick={() => setSelectedChoice('Replace Product')}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition cursor-pointer ${
                  selectedChoice === 'Replace Product'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolutionChoice"
                  checked={selectedChoice === 'Replace Product'}
                  onChange={() => setSelectedChoice('Replace Product')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Replace the Product</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Direct Replacement
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vendor dispatches a brand-new identical item (<strong className="text-slate-800">{selectedReturn.productName}</strong>) via expedited courier at zero extra charge to the customer.
                  </p>
                </div>
              </label>

              {/* Option 2: Refund Amount */}
              <label
                onClick={() => setSelectedChoice('Refund Amount')}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition cursor-pointer ${
                  selectedChoice === 'Refund Amount'
                    ? 'border-purple-500 bg-purple-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolutionChoice"
                  checked={selectedChoice === 'Refund Amount'}
                  onChange={() => setSelectedChoice('Refund Amount')}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Refund the Amount</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Invoice Credit
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Full monetary refund of <strong className="text-slate-900">₹{(selectedReturn.refundAmount || 14500).toLocaleString()}</strong> credited back to the customer's billing balance or original payment account.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Resolution Choice
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Process Replacement Dispatch */}
      {selectedReturn && (
        <Modal
          isOpen={replacementModalOpen}
          onClose={() => setReplacementModalOpen(false)}
          title="Process Replacement Shipment Dispatch"
          subtitle={`Authorize new shipment for customer ${selectedReturn.customerName}.`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReplacement} className="space-y-4">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Dispatching Replacement Unit:</p>
              <p>{selectedReturn.productName} • Qty: {selectedReturn.quantity}</p>
              <p className="text-[11px] text-emerald-700">Delivery address: BioMed Campus Bay 2, Tech Park</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Replacement Tracking Number
              </label>
              <input
                type="text"
                required
                value={replacementTracking}
                onChange={e => setReplacementTracking(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReplacementModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch Replacement</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Authorize & Issue Refund */}
      {selectedReturn && (
        <Modal
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title="Authorize & Issue Customer Refund"
          subtitle={`Process monetary reimbursement for claim ${selectedReturn.returnNumber}.`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmRefund} className="space-y-4">
            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
              <p className="font-bold">Refund Summary for Customer:</p>
              <p>{selectedReturn.customerName} • {selectedReturn.productName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Refund Reference #
                </label>
                <input
                  type="text"
                  required
                  value={refundRef}
                  onChange={e => setRefundRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Refund Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={customRefundAmount}
                  onChange={e => setCustomRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Authorize & Issue Refund</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 5: Log Customer Damage Claim Directly */}
      <Modal
        isOpen={createClaimModalOpen}
        onClose={() => setCreateClaimModalOpen(false)}
        title="Log Customer Damaged Product Claim"
        subtitle="Register incoming customer return or delivery damage report."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateClaim} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Shipment
              </label>
              <select
                value={newShipmentId}
                onChange={e => setNewShipmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
                value={newProductId}
                onChange={e => setNewProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
                Customer Organization / Name
              </label>
              <input
                type="text"
                required
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Problem Reason
              </label>
              <select
                value={newReason}
                onChange={e => setNewReason(e.target.value as ReturnCase['reason'])}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Damaged in Transit">Damaged in Transit (Cracked, crushed, leaked)</option>
                <option value="Defective Unit">Defective Unit (Seal/sensor failure)</option>
                <option value="Incorrect Item Received">Incorrect Item Received</option>
                <option value="Customer Cancellation">Protocol Change</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Desired Resolution Choice
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setNewChoice('Replace Product')}
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                  newChoice === 'Replace Product'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="newChoice"
                  checked={newChoice === 'Replace Product'}
                  onChange={() => setNewChoice('Replace Product')}
                  className="text-emerald-600"
                />
                <span className="text-xs">Replace Product</span>
              </label>

              <label
                onClick={() => setNewChoice('Refund Amount')}
                className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                  newChoice === 'Refund Amount'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="newChoice"
                  checked={newChoice === 'Refund Amount'}
                  onChange={() => setNewChoice('Refund Amount')}
                  className="text-purple-600"
                />
                <span className="text-xs">Refund Amount</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Problem Description & Initial Notes
            </label>
            <textarea
              rows={2}
              required
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Describe the damaged condition, broken seals, or customer notes..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateClaimModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
