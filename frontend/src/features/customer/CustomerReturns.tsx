import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RotateCcw, Package, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export const CustomerReturns: React.FC = () => {
  const navigate = useNavigate();
  const { returns } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Return & Replacement Claims
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status tracking for return shipments, hub inspections, and replacement units.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/issues')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Request New Return
        </button>
      </div>

      <div className="space-y-4">
        {returns.map(r => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-slate-900">
                    {r.returnNumber}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-slate-500">
                  Original Order:{' '}
                  <span className="font-mono font-bold text-indigo-600">
                    {r.trackingNumber}
                  </span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Date Filed:</span>{' '}
                <span className="text-xs font-semibold text-slate-700">
                  {new Date(r.requestedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Product & Quantity
                </span>
                <p className="font-bold text-slate-900 mt-0.5">{r.productName} ({r.quantity} unit)</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Reason Reported
                </span>
                <p className="font-bold text-rose-700 mt-0.5">{r.reason}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Replacement Order
                </span>
                <p className="font-bold font-mono text-emerald-700 mt-0.5">
                  {r.replacementShipmentId ? (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{r.replacementShipmentId} Dispatched</span>
                    </span>
                  ) : (
                    'Under Technical Review'
                  )}
                </p>
              </div>
            </div>

            {r.inspectionNotes && (
              <div className="text-xs text-slate-600 pt-1">
                <strong className="text-slate-800">Technician Feedback:</strong> {r.inspectionNotes}
              </div>
            )}
          </div>
        ))}

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
