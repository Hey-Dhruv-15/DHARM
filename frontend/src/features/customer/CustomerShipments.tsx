import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const CustomerShipments: React.FC = () => {
  const navigate = useNavigate();
  const { shipments } = useData();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(shipments[0]?.id || null);

  const filtered = shipments.filter(
    s =>
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Delivery Orders & Consignment History
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed records of all medical and clinical trial consignments dispatched to BioMed Research.
        </p>
      </div>

      <div className="relative bg-white p-3 rounded-xl border border-slate-200/80">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by tracking number, item, or status..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-4">
        {filtered.map(s => {
          const isExpanded = expandedId === s.id;
          const totalUnits = s.items.reduce((acc, i) => acc + i.expectedQuantity, 0);

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {s.trackingNumber}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Carrier: {s.vendorName} • Origin: {s.origin}
                  </p>
                  <p className="text-xs text-slate-600 font-semibold">
                    {s.items.length} Product lines ({totalUnits} total units)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/customer/issues')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Report Problem
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Expected Products in Consignment
                  </h4>
                  <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">SKU Code</th>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4">Expected Quantity</th>
                        <th className="py-2.5 px-4">Verified by Carrier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{it.sku}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{it.productName}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{it.expectedQuantity} units</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-600">{it.verifiedQuantity || 0} units</td>
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
