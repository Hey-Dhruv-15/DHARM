import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Truck,
  ScanLine,
  AlertTriangle,
  Clock,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Send
} from 'lucide-react';

export const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, scanRecords, discrepancies } = useData();

  // 1. Incoming Shipments (In Transit or Dispatched towards vendor)
  const incomingShipments = shipments.filter(
    s => s.status === 'Dispatched' || s.status === 'In Transit'
  );

  // 2. Awaiting Verification (Docked or Verification Pending)
  const awaitingVerification = shipments.filter(
    s => s.status === 'Received' || s.status === 'Verification Pending'
  );

  // 3. Open Discrepancies
  const openDiscrepancies = discrepancies.filter(d => d.status !== 'Resolved');
  const damagedDiscrepancies = discrepancies.filter(d => d.type === 'Damaged Goods');

  // 4. Outgoing Deliveries to Customers
  const outgoingShipments = shipments.filter(
    s => s.status === 'In Transit' || s.status === 'Delivered'
  );
  const deliveredShipments = shipments.filter(s => s.status === 'Delivered');

  // Compact Chart Data: Shipment Status Distribution
  const statusChartData = [
    {
      name: 'In Transit',
      count: shipments.filter(s => s.status === 'In Transit' || s.status === 'Dispatched').length,
      fill: '#3B82F6'
    },
    {
      name: 'Docked',
      count: shipments.filter(s => s.status === 'Received' || s.status === 'Verification Pending').length,
      fill: '#F59E0B'
    },
    {
      name: 'Exceptions',
      count: shipments.filter(s => s.status === 'Discrepancy Detected').length,
      fill: '#EF4444'
    },
    {
      name: 'Delivered',
      count: shipments.filter(s => s.status === 'Delivered' || s.status === 'Ready for Dispatch').length,
      fill: '#10B981'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Title & Active Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Midwest Sorting & Cross-Dock Hub 4 • Custody Terminal
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Vendor Logistics Operations
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Custody intake, barcode receipt verification, exception handling, and outbound dispatch.
        </p>
      </div>

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Incoming Shipments"
          value={incomingShipments.length}
          subtitle="Docking expected today"
          icon={Truck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/vendor/shipments')}
        />

        <StatCard
          title="Awaiting Verification"
          value={awaitingVerification.length}
          subtitle="Docked at sorting bay"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          alert={awaitingVerification.length > 0}
          alertText="Scan required"
          onClick={() => navigate('/vendor/scanner')}
        />

        <StatCard
          title="Open Exceptions"
          value={openDiscrepancies.length}
          subtitle={`${damagedDiscrepancies.length} damaged goods recorded`}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          alert={openDiscrepancies.length > 0}
          alertText="Investigation active"
          onClick={() => navigate('/vendor/discrepancies')}
        />

        <StatCard
          title="Outgoing Deliveries"
          value={outgoingShipments.length}
          subtitle={`${deliveredShipments.length} delivered to customer`}
          icon={Send}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => navigate('/vendor/shipments/outgoing')}
        />
      </div>

      {/* Operational Row 1: Incoming Shipments (Left) & Recent Scan Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Incoming & In-Hub Shipments */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Incoming & In-Hub Shipments
                </h3>
                <p className="text-xs text-slate-500">
                  Active shipments awaiting receipt and barcode verification
                </p>
              </div>

              <button
                onClick={() => navigate('/vendor/shipments')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                <span>View All ({shipments.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {shipments.map(s => {
                const totalExp = s.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
                const totalVer = s.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);
                const isReadyToScan = s.status === 'Dispatched' || s.status === 'Received' || s.status === 'Discrepancy Detected';
                const progressPct = totalExp > 0 ? Math.round((totalVer / totalExp) * 100) : 0;

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900">
                            {s.trackingNumber}
                          </span>
                          <StatusBadge status={s.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">
                          Consignee: <strong className="text-slate-700">{s.customerName}</strong> • {s.items.length} Product line(s)
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">
                          {totalVer} / {totalExp} Verified
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                          <div
                            className={`h-full rounded-full ${
                              progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-indigo-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Route: <span className="font-medium text-slate-700">{s.origin}</span> → <span className="font-medium text-slate-700">{s.destination}</span>
                      </span>

                      {isReadyToScan && (
                        <button
                          onClick={() => navigate('/vendor/scanner')}
                          className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition cursor-pointer"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>Scan & Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Scan Activity */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Scan Activity
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time barcode audit events
                </p>
              </div>
              <Barcode className="w-5 h-5 text-indigo-500" />
            </div>

            <div className="space-y-3">
              {scanRecords.slice(0, 5).map(record => (
                <div
                  key={record.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-700">
                      {record.scannedCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        record.result === 'Expected Match'
                          ? 'bg-emerald-100 text-emerald-800'
                          : record.result === 'Duplicate Attempt'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {record.result}
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] line-clamp-1">
                    {record.notes}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>By: {record.scannedBy}</span>
                    <span>{new Date(record.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/vendor/scanner')}
              className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ScanLine className="w-4 h-4" />
              <span>Launch Barcode Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Row 2: Exceptions Requiring Attention & Shipment Status Overview Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Exceptions Requiring Attention */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Exceptions Requiring Attention
              </h3>
              <p className="text-xs text-slate-500">
                Unresolved discrepancies awaiting hub investigation
              </p>
            </div>
            <button
              onClick={() => navigate('/vendor/discrepancies')}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
            >
              <span>Manage ({openDiscrepancies.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {openDiscrepancies.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Open Exceptions</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All received shipments verified intact.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openDiscrepancies.slice(0, 3).map(disc => (
                <div
                  key={disc.id}
                  className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {disc.discrepancyNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          disc.severity === 'Critical'
                            ? 'bg-rose-100 text-rose-700'
                            : disc.severity === 'High'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {disc.severity}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-slate-500">
                      {disc.type}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <p><strong className="text-slate-800">Shipment:</strong> {disc.shipmentTracking} • {disc.productName || 'Damaged Unit'}</p>
                    <p className="text-slate-500 mt-0.5">Observed: <strong className="text-rose-600">{disc.observedQuantity}</strong> / Expected: {disc.expectedQuantity} units ({disc.detectionStage})</p>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => navigate('/vendor/discrepancies')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Investigate Exception →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shipment Status Overview (Compact Chart) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Shipment Status Overview
              </h3>
              <p className="text-xs text-slate-500">
                Custody lifecycle distribution across current workload
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {shipments.length} Active Shipments
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Row 3: Outgoing Deliveries Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Outgoing Deliveries to Customers</h4>
              <p className="text-xs text-slate-500">Active outbound dispatches and customer handovers</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/vendor/shipments/outgoing')}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Manage Outgoing Dispatches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">In Delivery</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{outgoingShipments.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Delivered Orders</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{deliveredShipments.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Courier</p>
            <p className="text-xs font-bold text-slate-700 mt-1.5">Midwest Van Express #402</p>
          </div>
        </div>
      </div>
    </div>
  );
};
