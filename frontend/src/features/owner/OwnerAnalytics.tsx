import React from 'react';
import { useData } from '../../context/DataContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Percent,
  DollarSign,
  Layers,
  Truck
} from 'lucide-react';

export const OwnerAnalytics: React.FC = () => {
  const { products, shipments, discrepancies } = useData();

  // Weekly Match Rate Data
  const matchRateData = [
    { week: 'W38', target: 98, actual: 95.2 },
    { week: 'W39', target: 98, actual: 96.4 },
    { week: 'W40', target: 98, actual: 94.8 },
    { week: 'W41', target: 98, actual: 97.1 },
    { week: 'W42', target: 98, actual: 96.8 },
    { week: 'W43', target: 98, actual: 98.6 }
  ];

  // Discrepancy Types Distribution
  const typeBreakdown = [
    { type: 'Missing Units', count: 6 },
    { type: 'Wrong Container', count: 4 },
    { type: 'Damaged Goods', count: 3 },
    { type: 'Duplicate Scans', count: 8 },
    { type: 'Unmanifested SKU', count: 2 }
  ];

  // Stock Units by Category (Moved from Dashboard to Analytics)
  const categoryCounts: Record<string, number> = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + p.stockQuantity;
  });
  const categoryChartData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    value: categoryCounts[cat]
  }));
  const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  // Vendor Custody Scorecard (Moved from Dashboard to Vendor Analytics)
  const vendorStats = [
    { vendor: 'Trans-Express Regional Logistics', shipments: 14, matched: 13, discrepancies: 1, matchRate: '92.8%' },
    { vendor: 'Apex Air Freight Express', shipments: 8, matched: 8, discrepancies: 0, matchRate: '100%' },
    { vendor: 'Central Cross-Dock Partners', shipments: 12, matched: 11, discrepancies: 1, matchRate: '91.6%' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Logistics Performance & Inventory Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed metrics for manifest reconciliation, category allocations, and carrier custody performance.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Overall Match Rate
          </span>
          <p className="text-2xl font-extrabold text-emerald-600">97.4%</p>
          <span className="text-xs text-slate-500">+1.6% from last sprint</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Discrepancy Catch Rate
          </span>
          <p className="text-2xl font-extrabold text-indigo-600">100%</p>
          <span className="text-xs text-slate-500">Zero unrecorded leaks</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Avg Resolution Time
          </span>
          <p className="text-2xl font-extrabold text-slate-900">14.2 hrs</p>
          <span className="text-xs text-slate-500">-3.4 hrs improvement</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Loss Prevented (MTD)
          </span>
          <p className="text-2xl font-extrabold text-purple-600">$48,250</p>
          <span className="text-xs text-slate-500">Via early barcode checks</span>
        </div>
      </div>

      {/* Charts Grid: Match Rate Trend & Exception Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Rate Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Weekly Manifest Match Rate (%)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Comparison of actual zero-mismatch dispatches against 98% SLA target
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Actual Rate %" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} name="SLA Target %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Units by Category (Moved from Dashboard) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Stock Units by Category
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Inventory distribution across medical hardware, biologics, and consumables
            </p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            {categoryChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Vendor Scorecard & Root Cause Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Custody Scorecard (Moved from Dashboard) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Vendor Custody Scorecard
            </h3>
            <p className="text-xs text-slate-500">
              Handover accuracy & exception rate across carrier partners
            </p>
          </div>

          <div className="space-y-4">
            {vendorStats.map(v => (
              <div key={v.vendor} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate pr-2">
                    {v.vendor}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {v.matchRate}
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: v.matchRate }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{v.shipments} Shipments Handled</span>
                  <span className={v.discrepancies > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                    {v.discrepancies} Discrepancy Flagged
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exception Frequency by Type */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Exception Frequency by Type
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Most frequent discrepancy causes detected by the DHARM engine
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} name="Detected Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
