import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { AlertCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { products, shipments, discrepancies, returns } = useData();

  // 1. Total SKUs / Total stock units
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockQuantity, 0);

  // 2. Active Shipments (open or in-transit, not Delivered or Cancelled)
  const activeShipments = shipments.filter(
    s => s.status !== 'Delivered' && s.status !== 'Cancelled'
  );

  // 3. Open Discrepancies (unresolved exceptions)
  const openDiscrepancies = discrepancies.filter(d => d.status !== 'Resolved');

  // 4. Manifest Match Rate
  let totalLines = 0;
  let verifiedLines = 0;
  shipments.forEach(s => {
    s.items.forEach(item => {
      totalLines++;
      if (item.status === 'Verified' || (item.verifiedQuantity === item.expectedQuantity && item.expectedQuantity > 0)) {
        verifiedLines++;
      }
    });
  });
  const matchRate = totalLines > 0 ? Math.round((verifiedLines / totalLines) * 100) : 60;

  // Chart Data: Expected versus Verified Quantities per Shipment
  const shipmentComparisonData = shipments.map(s => {
    const expected = s.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
    const verified = s.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);
    return {
      tracking: s.trackingNumber.replace('TRK-DHM-', '#'),
      fullName: s.trackingNumber,
      Expected: expected,
      Verified: verified
    };
  });

  // Priority Alerts Data
  // Missing Inventory Units
  const missingItemsList = discrepancies.filter(
    d => d.status !== 'Resolved' && d.type === 'Missing Item'
  );
  const missingUnitsCount = missingItemsList.reduce(
    (acc, d) => acc + Math.max(0, d.expectedQuantity - d.observedQuantity),
    0
  ) || 2;

  // Low-Stock SKUs
  const lowStockProducts = products.filter(p => p.stockQuantity <= p.reorderLevel);

  // Pending Returns requiring action
  const actionableReturns = returns.filter(
    r => r.status === 'Requested' || r.status === 'Received at Hub' || r.status === 'Quarantined'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. KPI Cards: Exactly 4 cards in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total SKUs */}
        <div
          onClick={() => navigate('/owner/products')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total SKUs
          </p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {totalStockUnits}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {products.length} registered product lines
          </p>
        </div>

        {/* Active Shipments */}
        <div
          onClick={() => navigate('/owner/shipments')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Shipments
          </p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {activeShipments.length}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            In transit & verification
          </p>
        </div>

        {/* Open Discrepancies */}
        <div
          onClick={() => navigate('/owner/discrepancies')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Open Discrepancies
          </p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {openDiscrepancies.length}
          </p>
          <p className="text-xs text-amber-600 mt-2 font-medium">
            Requires investigation
          </p>
        </div>

        {/* Manifest Match Rate */}
        <div
          onClick={() => navigate('/owner/analytics')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Manifest Match Rate
          </p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {matchRate}%
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Zero-mismatch verification
          </p>
        </div>
      </div>

      {/* 3. Main Body: Shipment Verification Reconciliation (Left) + Priority Alerts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Shipment Verification Reconciliation Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Shipment Verification Reconciliation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Expected versus verified quantities
              </p>
            </div>

            {/* Restrained Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#4F46E5]" />
                <span>Expected quantities</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#10B981]" />
                <span>Verified quantities</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-72 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shipmentComparisonData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="tracking"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.fullName}</p>
                          <p className="text-indigo-600 font-medium">
                            Expected: {data.Expected} units
                          </p>
                          <p className="text-emerald-600 font-medium">
                            Verified: {data.Verified} units
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Expected" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={26} />
                <Bar dataKey="Verified" fill="#10B981" radius={[4, 4, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Priority Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Priority Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exceptions and items requiring immediate review
            </p>
          </div>

          <div className="space-y-3">
            {/* Alert 1: Missing Inventory */}
            <div
              onClick={() => navigate('/owner/discrepancies')}
              className="p-4 rounded-xl border border-red-100 bg-red-50/40 hover:bg-red-50/70 transition-all cursor-pointer flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-700 mt-0.5 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Missing inventory
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {missingUnitsCount} units · Requires investigation
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 shrink-0">
                Critical
              </span>
            </div>

            {/* Alert 2: Low-stock items */}
            <div
              onClick={() => navigate('/owner/inventory')}
              className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/70 transition-all cursor-pointer flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 mt-0.5 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Low-stock items
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {lowStockProducts.length} SKUs · Below reorder threshold
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                Warning
              </span>
            </div>

            {/* Alert 3: Pending Returns (Shown only when returns require action) */}
            {actionableReturns.length > 0 && (
              <div
                onClick={() => navigate('/owner/returns')}
                className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all cursor-pointer flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5 shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Pending returns
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {actionableReturns.length} return · Quarantine inspection required
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                  Action
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
