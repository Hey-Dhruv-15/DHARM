import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Package,
  HelpCircle,
  FileText
} from 'lucide-react';
import type { Shipment } from '../../types';

export const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, returns, discrepancies, confirmCustomerDelivery } = useData();
  const { user } = useAuth();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('All units received intact and cold-chain temperature logged within specification.');

  // Shipments for Customer (BioMed)
  const myShipments = shipments;
  const activeDeliveries = myShipments.filter(s => s.status === 'In Transit' || s.status === 'Dispatched' || s.status === 'Partially Delivered');
  const deliveredOrders = myShipments.filter(s => s.status === 'Delivered');
  const pendingConfirmations = myShipments.filter(s => s.status === 'In Transit' || s.status === 'Discrepancy Detected');
  const openIssues = discrepancies.filter(d => d.detectionStage === 'Customer Handover' || d.status !== 'Resolved');
  const myReturns = returns;

  const handleOpenConfirm = (s: Shipment) => {
    setSelectedShipment(s);
    setConfirmModalOpen(true);
  };

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    confirmCustomerDelivery(
      selectedShipment.id,
      user?.name || 'Anusha S (Customer)',
      deliveryNotes
    );

    setConfirmModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              BioMed Research Campus Bay 2 • Receiving Portal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Welcome, Anusha S
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track incoming pharmaceutical deliveries, verify received contents, and manage returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer/issues')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>

          <button
            onClick={() => navigate('/customer/returns')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>My Returns ({myReturns.length})</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Cards (Specified in User Request) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Active Deliveries"
          value={activeDeliveries.length}
          subtitle="En route to your facility"
          icon={Truck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/customer/shipments')}
        />

        <StatCard
          title="Delivered Orders"
          value={deliveredOrders.length}
          subtitle="Signed and received"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => navigate('/customer/shipments')}
        />

        <StatCard
          title="Pending Sign-Off"
          value={pendingConfirmations.length}
          subtitle="Awaiting your confirmation"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          alert={pendingConfirmations.length > 0}
          alertText="Action needed"
          onClick={() => navigate('/customer/shipments')}
        />

        <StatCard
          title="Open Issues"
          value={openIssues.length}
          subtitle="Exceptions under review"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          onClick={() => navigate('/customer/issues')}
        />

        <StatCard
          title="Returns & Replacements"
          value={myReturns.length}
          subtitle="Warranty claims active"
          icon={RotateCcw}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => navigate('/customer/returns')}
        />
      </div>

      {/* Active Shipment Tracker Card with Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">
                {myShipments[0]?.trackingNumber}
              </span>
              <StatusBadge status={myShipments[0]?.status || 'In Transit'} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Carrier: <strong>Trans-Express Logistics</strong> • Expected Delivery:{' '}
              {myShipments[0]?.estimatedDelivery ? new Date(myShipments[0].estimatedDelivery).toLocaleDateString() : 'Today'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenConfirm(myShipments[0])}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Confirm Delivery Receipt
            </button>
            <button
              onClick={() => navigate('/customer/issues')}
              className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Report Issue
            </button>
          </div>
        </div>

        {/* Visual Timeline (Draft -> Dispatched -> Received at Hub -> Out for Delivery -> Delivered) */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Custody Handover Progress
          </span>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              <div className="text-[10px] uppercase text-emerald-600 font-semibold">Stage 1</div>
              <div>Dispatched</div>
              <div className="text-[10px] text-emerald-700 font-normal">Apex Central Depot</div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              <div className="text-[10px] uppercase text-emerald-600 font-semibold">Stage 2</div>
              <div>Vendor Hub Verified</div>
              <div className="text-[10px] text-emerald-700 font-normal">Midwest Hub 4</div>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
              <div className="text-[10px] uppercase text-indigo-600 font-semibold">Stage 3</div>
              <div>Out For Delivery</div>
              <div className="text-[10px] text-indigo-700 font-normal">En route to Bay 2</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold border border-slate-200">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Stage 4</div>
              <div>Hospital Receipt</div>
              <div className="text-[10px] text-slate-400 font-normal">Awaiting Sign-Off</div>
            </div>
          </div>
        </div>

        {/* Expected Items List */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Expected Products in this Consignment
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {myShipments[0]?.items.map((item, idx) => (
              <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <div className="font-bold text-slate-900">{item.productName}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{item.sku} • In {item.containerNumber}</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{item.expectedQuantity} units</span>
                  <div className="text-[10px] text-emerald-600 font-semibold">Inspected by Carrier</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Confirm Delivery Receipt */}
      {selectedShipment && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={`Confirm Receipt: ${selectedShipment.trackingNumber}`}
          subtitle="Sign off on physical handover of packages at your facility."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReceipt} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 inline-block mr-1.5" />
              <span>
                By confirming receipt, you verify that courier handed over containers and cold-chain temperature logger was verified intact.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Handover Notes / Inspection Sign-off
              </label>
              <textarea
                rows={3}
                required
                value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm Delivery Sign-Off
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
