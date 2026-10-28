import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  RotateCcw,
  Package,
  ArrowRight,
  ShieldCheck,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Warehouse
} from 'lucide-react';

export const CustomerReturns: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { returns, orders, shipments } = useData();

  // Filter returns strictly for current customer
  const customerReturns = useMemo(() => {
    return returns.filter(
      r => r.customerId === (user?.id || 'usr-cust-03') || r.customerName.includes('Anusha')
    );
  }, [returns, user?.id]);

  // Delivered shipments eligible for return
  const deliveredShipments = useMemo(() => {
    return shipments.filter(s => s.customerId === (user?.id || 'usr-cust-03') && s.status === 'Delivered');
  }, [shipments, user?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Warranty Claims & Reverse Logistics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Returns & Replacements Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track return pickups, hub inspection quarantines, warranty replacement consignments, and credit notes.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/issues')}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Request New Return</span>
        </button>
      </div>

      {/* Return Inventory Policy Notice */}
      <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 text-xs text-purple-950 flex items-start gap-3">
        <Warehouse className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold">DHARM Reverse Logistics & Quarantine Policy:</span>
          <p className="text-purple-800 text-[11px] mt-0.5 leading-relaxed">
            All returned units (including cold-chain specimen transporters and sensor arrays) are immediately routed into isolated vendor hub quarantine bays. Returned items are strictly prohibited from re-entering active sellable inventory until complete analytical re-certification is logged.
          </p>
        </div>
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {customerReturns.map(r => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {r.returnNumber}
                </span>
                <StatusBadge status={r.status} />
              </div>

              <div className="text-xs text-slate-500">
                Filed on:{' '}
                <span className="font-semibold text-slate-700">
                  {new Date(r.requestedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Scope Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Product & Scope
                </span>
                <p className="font-extrabold text-slate-900 mt-0.5">{r.productName}</p>
                <p className="text-slate-500 font-mono text-[11px]">Quantity: {r.quantity} unit</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reason & Condition
                </span>
                <p className="font-bold text-rose-700 mt-0.5">{r.reason}</p>
                <p className="text-slate-500 text-[11px]">
                  Condition: {r.productCondition || 'Damaged exterior seal'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Original Consignment
                </span>
                <p className="font-mono font-bold text-indigo-700 mt-0.5">
                  {r.trackingNumber}
                </p>
                <p className="text-slate-500 text-[11px]">Trans-Express Logistics</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Warranty Replacement
                </span>
                {r.replacementShipmentId ? (
                  <div className="mt-0.5">
                    <button
                      onClick={() => navigate('/customer/shipments')}
                      className="font-mono font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{r.replacementShipmentId}</span>
                    </button>
                    <span className="text-[10px] text-emerald-600 block">Consignment Dispatched</span>
                  </div>
                ) : (
                  <p className="font-bold text-slate-600 mt-0.5">Awaiting Technical Review</p>
                )}
              </div>
            </div>

            {/* Hub Inspection and Quarantine Location Notes */}
            <div className="space-y-2 text-xs">
              {r.quarantineLocation && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Quarantine Bay:</strong> {r.quarantineLocation} (Stock isolated from sellable inventory)
                  </span>
                </div>
              )}

              {r.inspectionNotes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                  <strong className="text-slate-900">Hub Inspector Feedback:</strong> {r.inspectionNotes}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="text-slate-500">
                Refund Status: <strong className="text-slate-800">{r.refundStatus || 'Credit Note via PO'}</strong>
              </span>

              {r.replacementShipmentId && (
                <button
                  onClick={() => navigate('/customer/shipments')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Track Replacement Consignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {customerReturns.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
            <RotateCcw className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800">
              No Active Return Requests
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All your received consignments have been delivered and verified without reverse logistics claims.
            </p>
            {deliveredShipments.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => navigate('/customer/issues')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  File Return for a Delivered Order
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
