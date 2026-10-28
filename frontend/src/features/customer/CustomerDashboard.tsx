import React, { useState, useMemo } from 'react';
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
  ShoppingBag,
  FileText,
  Building,
  Bell,
  MapPin,
  ExternalLink
} from 'lucide-react';
import type { Shipment } from '../../types';

export const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    shipments,
    orders,
    discrepancies,
    returns,
    notifications,
    customerProfile,
    confirmCustomerDelivery
  } = useData();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('All units received intact and cold-chain temperature logged within specification.');

  // Customer isolated records
  const myCustomerId = user?.id || 'usr-cust-03';
  const myShipments = useMemo(() => shipments.filter(s => s.customerId === myCustomerId), [shipments, myCustomerId]);
  const myOrders = useMemo(() => orders.filter(o => o.customerId === myCustomerId), [orders, myCustomerId]);
  const myDiscrepancies = useMemo(() => discrepancies.filter(d => d.customerId === myCustomerId || d.detectedBy.includes('Anusha')), [discrepancies, myCustomerId]);
  const myReturns = useMemo(() => returns.filter(r => r.customerId === myCustomerId || r.customerName.includes('Anusha')), [returns, myCustomerId]);
  const myNotifications = useMemo(() => notifications.filter(n => n.customerId === myCustomerId), [notifications, myCustomerId]);

  // 4 Core KPIs requested in Section 10
  const activeOrdersCount = useMemo(() => myOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length, [myOrders]);
  const inTransitShipmentsCount = useMemo(() => myShipments.filter(s => s.status === 'In Transit' || s.status === 'Dispatched' || s.status === 'Partially Delivered' || s.status === 'Discrepancy Detected').length, [myShipments]);
  const deliveredOrdersCount = useMemo(() => myOrders.filter(o => o.status === 'Delivered').length, [myOrders]);
  const openDiscrepanciesCount = useMemo(() => myDiscrepancies.filter(d => d.status !== 'Resolved').length, [myDiscrepancies]);

  // Primary active shipment for the featured tracking card
  const activeShipment = useMemo(() => {
    return myShipments.find(s => s.status === 'Discrepancy Detected' || s.status === 'In Transit' || s.status === 'Dispatched') || myShipments[0];
  }, [myShipments]);

  // Pending action items
  const pendingSignOff = useMemo(() => {
    return myShipments.filter(s => s.status === 'In Transit' || s.status === 'Discrepancy Detected');
  }, [myShipments]);

  const handleOpenConfirm = (s: Shipment) => {
    setSelectedShipment(s);
    setConfirmModalOpen(true);
  };

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    confirmCustomerDelivery(
      selectedShipment.id,
      customerProfile.name || user?.name || 'Customer Consignee',
      deliveryNotes
    );

    setConfirmModalOpen(false);
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards (as specified in Section 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Orders"
          value={activeOrdersCount}
          subtitle="Orders currently in fulfillment"
          icon={ShoppingBag}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/customer/orders')}
        />

        <StatCard
          title="In-Transit Shipments"
          value={inTransitShipmentsCount}
          subtitle="Consignments en route to facility"
          icon={Truck}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          alert={inTransitShipmentsCount > 0}
          alertText="Tracking live"
          onClick={() => navigate('/customer/shipments')}
        />

        <StatCard
          title="Delivered Orders"
          value={deliveredOrdersCount}
          subtitle="Verified & signed off at dock"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => navigate('/customer/orders')}
        />

        <StatCard
          title="Open Discrepancies"
          value={openDiscrepanciesCount}
          subtitle="Exceptions undergoing review"
          icon={AlertTriangle}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          alert={openDiscrepanciesCount > 0}
          alertText="Audit review"
          onClick={() => navigate('/customer/issues')}
        />
      </div>

      {/* Featured Active Consignment Tracking Timeline */}
      {activeShipment && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {activeShipment.trackingNumber}
                </span>
                <StatusBadge status={activeShipment.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Carrier: <strong>{activeShipment.vendorName}</strong> • Destination:{' '}
                <strong>{activeShipment.destination}</strong> • Expected Delivery:{' '}
                <strong>
                  {activeShipment.estimatedDelivery ? new Date(activeShipment.estimatedDelivery).toLocaleDateString('en-IN') : 'Today'}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeShipment.status !== 'Delivered' && (
                <button
                  onClick={() => handleOpenConfirm(activeShipment)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Confirm Delivery Receipt
                </button>
              )}

              <button
                onClick={() => navigate(`/customer/verify?shipmentId=${encodeURIComponent(activeShipment.id)}`)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Verify Barcode
              </button>

              <button
                onClick={() => navigate('/customer/shipments')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                All Shipments
              </button>
            </div>
          </div>

          {/* Chronological Lifecycle Timeline */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Chronological Chain of Custody Progress
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-900 font-bold border border-emerald-200">
                <div className="text-[9px] uppercase text-emerald-700 font-semibold">Stage 1</div>
                <div>Dispatched</div>
                <div className="text-[10px] text-emerald-800 font-normal truncate">Apex Central Depot</div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-900 font-bold border border-emerald-200">
                <div className="text-[9px] uppercase text-emerald-700 font-semibold">Stage 2</div>
                <div>Vendor Hub Cross-Dock</div>
                <div className="text-[10px] text-emerald-800 font-normal truncate">Trans-Express Sorting</div>
              </div>

              <div className={`p-2.5 rounded-xl font-bold border ${activeShipment.status === 'Discrepancy Detected' ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-indigo-100 text-indigo-900 border-indigo-200'}`}>
                <div className="text-[9px] uppercase font-semibold">Stage 3</div>
                <div>{activeShipment.status === 'Discrepancy Detected' ? 'Exception Hold' : 'Out For Delivery'}</div>
                <div className="text-[10px] font-normal truncate">En route to Facility</div>
              </div>

              <div className={`p-2.5 rounded-xl font-bold border ${activeShipment.status === 'Delivered' ? 'bg-emerald-100/80 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                <div className="text-[9px] uppercase font-semibold">Stage 4</div>
                <div>Dock Handover</div>
                <div className="text-[10px] font-normal truncate">{activeShipment.status === 'Delivered' ? 'Signed & Received' : 'Awaiting Sign-Off'}</div>
              </div>
            </div>
          </div>

          {/* Consignment Items */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Deliverables in this Consignment ({activeShipment.items.length} product lines)
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {activeShipment.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50/50">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{item.sku} • In Container {item.containerNumber}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{item.expectedQuantity} units</span>
                    <div className="text-[10px] text-emerald-600 font-semibold">Carrier Verified</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Recent Orders & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">
              Recent Purchase Orders
            </h3>
            <button
              onClick={() => navigate('/customer/orders')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({myOrders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {myOrders.slice(0, 3).map(order => (
              <div
                key={order.id}
                className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 hover:border-slate-200 transition flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-slate-900">{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-slate-500">
                    {order.items.length} lines ({order.items.reduce((s, i) => s + i.quantity, 0)} units) • Ordered {new Date(order.orderDate).toLocaleDateString('en-IN')}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="font-bold text-slate-900">{formatCurrency(order.grandTotal)}</span>
                  <div>
                    <button
                      onClick={() => navigate('/customer/orders')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Details & Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {myOrders.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No active purchase orders found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Actions & Alerts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pending Delivery Sign-off card */}
          {pendingSignOff.length > 0 && (
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Consignee Action ({pendingSignOff.length})</span>
              </div>
              <p className="text-amber-800 text-[11px]">
                Shipment {pendingSignOff[0].trackingNumber} is scheduled for handover. Sign off delivery receipt to finalize custody transfer.
              </p>
              <button
                onClick={() => handleOpenConfirm(pendingSignOff[0])}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Sign Off Handover Receipt
              </button>
            </div>
          )}

          {/* Verification CTA Card */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Verify Received Item Packaging</span>
            </div>
            <p className="text-indigo-800 text-[11px] leading-relaxed">
              Scan individual medicine vials, sensors, or container barcodes to verify authenticity against the immutable DHARM ledger.
            </p>
            <button
              onClick={() => navigate('/customer/verify')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer pt-1"
            >
              <span>Launch Verification Camera</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent Notifications Snippet */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <h4 className="font-extrabold text-xs text-slate-800">Recent Notifications</h4>
              </div>
              <button
                onClick={() => navigate('/customer/notifications')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                View Feed
              </button>
            </div>

            <div className="space-y-2">
              {myNotifications.slice(0, 2).map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate(n.link || '/customer/notifications')}
                  className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-100 text-xs cursor-pointer space-y-0.5"
                >
                  <div className="font-bold text-slate-800">{n.title}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Confirm Delivery Receipt */}
      {selectedShipment && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={`Confirm Delivery Sign-Off: ${selectedShipment.trackingNumber}`}
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
