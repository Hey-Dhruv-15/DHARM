import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PackageCheck,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import type { CustomerResolutionChoice, ReturnCase } from '../../types';

export const CustomerReturns: React.FC = () => {
  const navigate = useNavigate();
  const { returns, setCustomerReturnChoice } = useData();
  const { user } = useAuth();

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleChoice = (retId: string, currentChoice?: CustomerResolutionChoice) => {
    const newChoice: CustomerResolutionChoice =
      currentChoice === 'Replace Product' ? 'Refund Amount' : 'Replace Product';
    setCustomerReturnChoice(retId, newChoice, user?.name || 'Customer');
    setTogglingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Return & Damaged Claims
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time tracking of returned products, vendor problem inspections, and your chosen resolution (Replace vs Refund).
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/issues')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Report Damaged Product</span>
        </button>
      </div>

      <div className="space-y-4">
        {returns.map(r => {
          const isResolved = r.status === 'Closed' || r.status === 'Replacement Dispatched' || r.status === 'Refund Processed';
          const isRefund = r.customerChoice === 'Refund Amount';

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 transition hover:border-slate-300"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {r.returnNumber}
                    </span>
                    <StatusBadge status={r.status} />

                    {/* Customer Choice Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        r.customerChoice === 'Refund Amount'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {r.customerChoice === 'Refund Amount' ? (
                        <>
                          <CreditCard className="w-3 h-3" />
                          <span>Choice: Refund Amount</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="w-3 h-3" />
                          <span>Choice: Replace Product</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Original Order:{' '}
                    <span className="font-mono font-bold text-indigo-600">
                      {r.trackingNumber}
                    </span>
                    {r.sku && (
                      <span className="ml-2 text-slate-400">
                        • SKU: <span className="font-mono text-slate-700">{r.sku}</span>
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400">Date Filed:</span>{' '}
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(r.requestedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Product & Quantity
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {r.productName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Quantity: {r.quantity} unit(s)</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Customer Reported Problem
                  </span>
                  <p className="font-bold text-rose-700 mt-0.5">{r.reason}</p>
                  {r.inspectionNotes && (
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate" title={r.inspectionNotes}>
                      "{r.inspectionNotes}"
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">
                    Settlement Outcome
                  </span>
                  {r.replacementShipmentId ? (
                    <div className="mt-0.5">
                      <p className="font-bold font-mono text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{r.replacementShipmentId}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">Replacement Dispatched</p>
                    </div>
                  ) : r.refundReference ? (
                    <div className="mt-0.5">
                      <p className="font-bold font-mono text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>${r.refundAmount?.toLocaleString()} USD</span>
                      </p>
                      <p className="text-[10px] text-slate-500">Refund Ref: {r.refundReference}</p>
                    </div>
                  ) : (
                    <div className="mt-0.5">
                      <p className="font-semibold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Pending Hub Check</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {isRefund ? `Authorized: $${r.refundAmount || 1420}` : 'New unit dispatched post-check'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Physical Check Status Box */}
              <div className="p-3.5 rounded-xl border bg-slate-50/70 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.vendorVerified ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Vendor Physical Check Completed</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Vendor Physical Check Pending</span>
                      </span>
                    )}
                  </div>

                  {r.vendorVerified && r.vendorVerifiedBy && (
                    <span className="text-[11px] text-slate-500">
                      Verified by <strong className="text-slate-700">{r.vendorVerifiedBy}</strong>
                    </span>
                  )}
                </div>

                {r.vendorVerified ? (
                  <div className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-slate-800 font-semibold">
                      Diagnostic Findings:{' '}
                      <span className="font-normal text-slate-700">
                        {r.problemDiagnosis || 'Defect confirmed matching customer claim. Item transferred to Quarantine.'}
                      </span>
                    </p>
                    {r.quarantineLocation && (
                      <p className="text-[11px] text-slate-500">
                        Quarantine Location: <span className="font-mono font-medium text-slate-700">{r.quarantineLocation}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Once the returned package reaches our warehouse, vendor technicians will physically inspect the reported defect and authorize your chosen settlement.
                  </p>
                )}
              </div>

              {/* Change Option Bar for customer */}
              {!isResolved && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-indigo-950">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Current Resolution Choice: <strong>{r.customerChoice || 'Replace Product'}</strong>.
                      Need to change your preference before shipment dispatch?
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleChoice(r.id, r.customerChoice)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold border border-indigo-200 rounded-lg shadow-2xs transition cursor-pointer shrink-0 text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      Switch to {r.customerChoice === 'Replace Product' ? 'Refund Amount' : 'Replace Product'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {returns.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-slate-700">No active return claims</p>
            <p className="text-xs mt-1">All your consignments have been delivered successfully.</p>
          </div>
        )}
      </div>
    </div>
  );
};
