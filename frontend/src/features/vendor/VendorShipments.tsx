import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Truck,
  ScanLine,
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Shipment } from '../../types';

export const VendorShipments: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, receiveShipment } = useData();
  const { user, role } = useAuth();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(shipments[0]?.id || null);

  const handleReceive = (s: Shipment) => {
    receiveShipment(s.id, user?.name || 'Sinu Gunshetty', role || 'VENDOR');
    alert(`Shipment ${s.trackingNumber} recorded as physically received at sorting dock!`);
  };

  const filtered = shipments.filter(
    s =>
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Assigned Inbound Shipments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Read-only immutable manifests created by Owner. Verify containers and items upon arrival.
          </p>
        </div>

        <button
          onClick={() => navigate('/vendor/scanner')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <ScanLine className="w-4 h-4" />
          <span>Receipt Scanner</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative bg-white p-3 rounded-xl border border-slate-200/80">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by tracking number, customer, or destination..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Shipment Manifest List */}
      <div className="space-y-4">
        {filtered.map(shipment => {
          const isExpanded = expandedId === shipment.id;
          const totalExp = shipment.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
          const totalVer = shipment.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);

          return (
            <div
              key={shipment.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            >
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {shipment.trackingNumber}
                    </span>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    From: <strong className="text-slate-700">{shipment.origin}</strong> → To: <strong className="text-slate-700">{shipment.destination}</strong> ({shipment.customerName})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right pr-3 border-r border-slate-100">
                    <div className="text-xs text-slate-400">Verified Count</div>
                    <div className="text-sm font-bold text-slate-800">
                      {totalVer} / {totalExp} units
                    </div>
                  </div>

                  {shipment.status === 'Dispatched' && (
                    <button
                      onClick={() => handleReceive(shipment)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Mark Arrived at Dock
                    </button>
                  )}

                  <button
                    onClick={() => navigate('/vendor/scanner')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : shipment.id)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Manifest Inspection View */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-700">Owner Dispatch Manifest (Locked):</span>
                      <span className="font-mono text-slate-500 text-[11px]">{shipment.manifestHash}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Read-Only View</span>
                  </div>

                  <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">SKU Code</th>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4">Container</th>
                        <th className="py-2.5 px-4">Manifest Expected</th>
                        <th className="py-2.5 px-4">Vendor Verified</th>
                        <th className="py-2.5 px-4">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shipment.items.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{it.sku}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{it.productName}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{it.containerNumber}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{it.expectedQuantity}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-600">{it.verifiedQuantity || 0}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                it.status === 'Verified'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : it.status === 'Mismatch'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {it.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
