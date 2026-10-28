import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Truck
} from 'lucide-react';

export const VendorInventory: React.FC = () => {
  const { shipments, returns } = useData();
  const [search, setSearch] = useState('');

  // Collect items currently docked or verified at the vendor hub
  const hubItems: { sku: string; name: string; container: string; verifiedQty: number; tracking: string; status: string }[] = [];

  shipments.forEach(s => {
    s.items.forEach(i => {
      if (i.verifiedQuantity > 0) {
        hubItems.push({
          sku: i.sku,
          name: i.productName,
          container: i.containerNumber,
          verifiedQty: i.verifiedQuantity,
          tracking: s.trackingNumber,
          status: s.status
        });
      }
    });
  });

  const filtered = hubItems.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.container.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Vendor Hub Stock & Cross-Dock Staging
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Physically scanned and verified products currently staged in Midwest Sorting Hub 4 bays.
        </p>
      </div>

      {/* Search */}
      <div className="relative bg-white p-3 rounded-xl border border-slate-200/80">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter verified items by SKU, container number, or name..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Hub Staging Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Staging Container</th>
                <th className="py-3 px-4">Verified Hub Quantity</th>
                <th className="py-3 px-4">Source Shipment</th>
                <th className="py-3 px-4">Staging Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                    {item.sku}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {item.container}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600">
                    {item.verifiedQty} units
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {item.tracking}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Cross-Dock Ready
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
