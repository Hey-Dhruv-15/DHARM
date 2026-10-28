import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Truck,
  ScanLine,
  AlertTriangle,
  Send,
  Layers,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Archive,
  Barcode
} from 'lucide-react';
import type { Shipment } from '../../types';

export const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, scanRecords, discrepancies, returns, receiveShipment } = useData();
  const { user, role } = useAuth();

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceiveShipmentId, setSelectedReceiveShipmentId] = useState('');

  // 1. Incoming Shipments (In Transit or Dispatched towards this vendor)
  const incomingShipments = shipments.filter(s => s.status === 'Dispatched' || s.status === 'In Transit');

  // 2. Awaiting Verification (Received or Verification Pending)
  const awaitingVerification = shipments.filter(s => s.status === 'Received' || s.status === 'Verification Pending');

  // 3. Verified Shipments
  const verifiedShipments = shipments.filter(s => s.status === 'Ready for Dispatch' || s.status === 'Delivered');

  // 4. Open Discrepancies
  const openDiscrepancies = discrepancies.filter(d => d.status !== 'Resolved');

  // 5. Damaged Products
  const damagedDiscrepancies = discrepancies.filter(d => d.type === 'Damaged Goods');

  // 6. Outgoing Deliveries to Customers
  const outgoingShipments = shipments.filter(s => s.status === 'In Transit' || s.status === 'Delivered');

  // 7. Pending Returns in Quarantine
  const pendingReturns = returns.filter(r => r.status !== 'Closed');

  const handleConfirmReceive = () => {
    if (!selectedReceiveShipmentId) return;
    receiveShipment(selectedReceiveReceiveShipmentId, user?.name || 'Sinu Gunshetty', role || 'VENDOR');
    setReceiveModalOpen(false);
    navigate('/vendor/scanner');
  };

  const selectedReceiveReceiveShipmentId = selectedReceiveShipmentId || incomingShipments[0]?.id || '';

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Midwest Sorting & Cross-Dock Hub 4 • Custody Terminal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Vendor Logistics Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Scan arriving cold-chain containers, verify line items against immutable owner manifest, and record exceptions.
          </p>
        </div>

        {/* 4 Prominent Actions (Specified in Spec) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setReceiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Truck className="w-4 h-4 text-slate-600" />
            <span>Receive Shipment</span>
          </button>

          <button
            onClick={() => navigate('/vendor/scanner')}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            <ScanLine className="w-4 h-4" />
            <span>Open Scanner</span>
          </button>

          <button
            onClick={() => navigate('/vendor/discrepancies')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Report Discrepancy</span>
          </button>

          <button
            onClick={() => navigate('/vendor/shipments/outgoing')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Create Outgoing</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Specified in User Request) */}
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
          title="Pending Returns"
          value={pendingReturns.length}
          subtitle="In quarantine custody"
          icon={RotateCcw}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => navigate('/vendor/returns')}
        />
      </div>

      {/* Main Two Columns: Active Arriving Shipments & Recent Scan Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Incoming & Verification Pending Shipments */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Incoming & In-Hub Shipments
                </h3>
                <p className="text-xs text-slate-500">
                  Manifests locked by Owner awaiting barcode receipt verification
                </p>
              </div>

              <button
                onClick={() => navigate('/vendor/shipments')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                View All ({shipments.length})
              </button>
            </div>

            <div className="space-y-3">
              {shipments.map(s => {
                const totalExp = s.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
                const totalVer = s.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);
                const isReadyToScan = s.status === 'Dispatched' || s.status === 'Received' || s.status === 'Discrepancy Detected';

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
                          Consignee: <strong className="text-slate-700">{s.customerName}</strong> • {s.items.length} Product lines
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">
                          {totalVer} / {totalExp} Verified
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="font-mono text-[11px] text-slate-400">
                        Hash: {s.manifestHash.substring(0, 18)}...
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

        {/* Right 5 Cols: Recent Live Scan Activity Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Scan Activity
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time barcode audit stream
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
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
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

                  <p className="text-slate-600 text-[11px]">
                    {record.notes}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>By: {record.scannedBy}</span>
                    <span>{new Date(record.scannedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/vendor/scanner')}
              className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ScanLine className="w-4 h-4" />
              <span>Launch Barcode Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Receive Shipment Dock Action */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="Receive Inbound Shipment"
        subtitle="Log arrival of carrier truck at Vendor Hub dock doors."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Incoming Shipment
            </label>
            <select
              value={selectedReceiveShipmentId}
              onChange={e => setSelectedReceiveShipmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {shipments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.trackingNumber} ({s.status}) — To: {s.customerName}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Clicking confirm will mark the shipment as docked at Midwest Sorting Hub 4 and transition immediately to barcode scanner verification.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReceiveModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReceive}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Confirm Docking & Open Scanner
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
