import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  MapPin,
  Box,
  Barcode
} from 'lucide-react';

export const OwnerInventory: React.FC = () => {
  const { products, shipments } = useData();
  const [search, setSearch] = useState('');

  // Total valuation calculation
  const totalValue = products.reduce((acc, p) => acc + p.stockQuantity * p.unitPrice, 0);

  // In-transit allocated units
  let inTransitUnits = 0;
  shipments
    .filter(s => s.status === 'In Transit' || s.status === 'Dispatched')
    .forEach(s => {
      s.items.forEach(i => {
        inTransitUnits += i.expectedQuantity;
      });
    });

  const filtered = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Master Inventory Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconciled physical balances, in-transit allocations, and automated safety stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Total Inventory Valuation
            </span>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              ${totalValue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Units In Warehouse
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {products.reduce((acc, p) => acc + p.stockQuantity, 0)} units
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Across {products.length} distinct SKUs
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Allocated In-Transit
          </span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">
            {inTransitUnits} units
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Currently moving through carrier custody
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Low Stock Alerts
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">
            {products.filter(p => p.stockQuantity <= p.reorderLevel).length} SKUs
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Below configured minimum safety thresholds
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative bg-white p-3 rounded-xl border border-slate-200/80">
        <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter inventory by SKU code, product title, or category..."
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Available Units</th>
                <th className="py-3 px-4">Reorder Level</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Total Asset Value</th>
                <th className="py-3 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map(p => {
                const isLow = p.stockQuantity <= p.reorderLevel;
                const assetValue = p.stockQuantity * p.unitPrice;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      <div>{p.sku}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{p.barcode}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {p.category}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.stockQuantity} {p.unit}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {p.reorderLevel} {p.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      ${p.unitPrice}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${assetValue.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Reorder Needed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Optimal Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
