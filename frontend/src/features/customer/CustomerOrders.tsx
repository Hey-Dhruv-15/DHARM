import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Truck,
  MoreVertical,
  AlertTriangle,
  Eye,
  FileText,
  CheckCircle2,
  Package,
  Printer,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import type { Order, OrderStatus, DiscrepancyType } from '../../types';

export const CustomerOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    orders,
    customerProfile,
    submitCustomerDiscrepancy,
    discrepancies
  } = useData();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);

  // Modals State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Report Problem Modal State
  const [reportProblemModalOpen, setReportProblemModalOpen] = useState(false);
  const [reportOrder, setReportOrder] = useState<Order | null>(null);
  const [reportProductId, setReportProductId] = useState('');
  const [reportCategory, setReportCategory] = useState<DiscrepancyType>('Damaged Goods');
  const [reportExpectedQty, setReportExpectedQty] = useState(1);
  const [reportObservedQty, setReportObservedQty] = useState(1);
  const [reportDescription, setReportDescription] = useState('');
  const [reportResolution, setReportResolution] = useState<'Replacement' | 'Return' | 'Refund' | 'Assistance'>('Replacement');
  const [reportSuccessCase, setReportSuccessCase] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // ORDER HISTORY: Displays orders where status is 'Delivered'
  const historyOrders = useMemo(() => {
    return orders.filter(
      o => o.customerId === (user?.id || 'usr-cust-03') && o.status === 'Delivered'
    );
  }, [orders, user?.id]);

  // Search & Filter Logic
  const filteredOrders = useMemo(() => {
    let result = [...historyOrders];

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerPoNumber && o.customerPoNumber.toLowerCase().includes(q)) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q)) ||
          o.customerName.toLowerCase().includes(q) ||
          (customerProfile.companyName && customerProfile.companyName.toLowerCase().includes(q)) ||
          o.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    return result;
  }, [historyOrders, search, customerProfile.companyName]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  // Action Menu Handlers
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
    setOpenMenuOrderId(null);
  };

  const handleOpenInvoice = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceModalOpen(true);
    setOpenMenuOrderId(null);
  };

  // Report Problem Handlers
  const handleOpenReportProblem = (order: Order) => {
    setReportOrder(order);
    const firstItem = order.items[0];
    setReportProductId(firstItem?.productId || '');
    setReportExpectedQty(firstItem?.quantity || 1);
    setReportObservedQty(1);
    setReportCategory('Damaged Goods');
    setReportDescription('');
    setReportResolution('Replacement');
    setReportSuccessCase(null);
    setReportProblemModalOpen(true);
    setOpenMenuOrderId(null);
  };

  const handleReportItemChange = (prodId: string) => {
    setReportProductId(prodId);
    const item = reportOrder?.items.find(i => i.productId === prodId);
    if (item) {
      setReportExpectedQty(item.quantity);
      setReportObservedQty(Math.min(reportObservedQty, item.quantity));
    }
  };

  const handleConfirmReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportOrder) return;

    const item = reportOrder.items.find(i => i.productId === reportProductId) || reportOrder.items[0];
    setReportSubmitting(true);
    setReportError(null);

    try {
      const newCase = submitCustomerDiscrepancy(
        {
          orderId: reportOrder.id,
          shipmentId: reportOrder.shipmentId || 'shp-2026-001',
          productId: item?.productId || 'prod-001',
          category: reportCategory,
          expectedQuantity: reportExpectedQty,
          observedQuantity: reportObservedQty,
          description: reportDescription || `Problem reported by customer for delivered order ${reportOrder.orderNumber}: ${reportCategory}.`,
          preferredResolution: reportResolution
        },
        user?.id || 'usr-cust-03',
        customerProfile.name || user?.name || 'Customer'
      );

      setReportSuccessCase(newCase.discrepancyNumber);
    } catch (err: any) {
      console.error('Error submitting discrepancy:', err);
      setReportError(err.message || 'Failed to submit problem report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Search Controls */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search delivered order history by order #, PO #, deliverable..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
            />
          </div>

          <button
            onClick={() => setSearch('')}
            className="p-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-500 rounded-xl transition cursor-pointer shadow-2xs"
            title="Reset search"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Navigate back to active Orders */}
        <button
          onClick={() => navigate('/customer/order')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shrink-0"
        >
          <span>Active Orders in Fulfillment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Table / List View Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Order & Customer PO
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer Account
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Deliverables
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Delivery & Logistics
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Order Total
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Fulfillment
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
                const hasDiscrepancy = discrepancies.some(
                  d => d.orderId === order.id || d.orderNumber === order.orderNumber
                );
                const firstItemName = order.items[0]?.productName || 'Diagnostic Supplies';
                const extraItemsCount = order.items.length - 1;

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/60 transition group"
                  >
                    {/* Order & Customer PO */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight font-mono">
                        {order.orderNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {order.customerPoNumber ? (
                          <span>PO: {order.customerPoNumber}</span>
                        ) : (
                          <span>Direct Commercial Order</span>
                        )}
                      </div>
                      {hasDiscrepancy && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                            Problem Reported
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Customer Account */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[170px]">
                        {customerProfile.companyName || order.customerName || 'BioMed Diagnostics'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                        {order.shippingAddress?.city || 'Bengaluru'}, {order.shippingAddress?.state || 'KA'}
                      </div>
                    </td>

                    {/* Deliverables / Opportunity */}
                    <td className="py-4 px-4 align-top">
                      <div className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1 max-w-[220px]">
                        {firstItemName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {extraItemsCount > 0 ? `+${extraItemsCount} additional SKUs` : `${order.items[0]?.sku || 'Single SKU'}`} • {totalUnits} units
                      </div>
                    </td>

                    {/* Delivery & Logistics */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-800 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {order.expectedDeliveryDate
                            ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {order.logisticsProvider || 'Bluedart Express'}
                        </span>
                      </div>
                    </td>

                    {/* Order Total */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {formatCurrency(order.grandTotal)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tax Included
                      </div>
                    </td>

                    {/* Fulfillment Badge (Delivered) */}
                    <td className="py-4 px-4 align-top">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivered</span>
                      </span>
                    </td>

                    {/* Actions Menu (⋮) */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenMenuOrderId(openMenuOrderId === order.id ? null : order.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuOrderId === order.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenMenuOrderId(null)} />
                            <div
                              className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                            >
                              {/* Action: Report a Problem (Primary for Delivered Orders) */}
                              <button
                                onClick={() => handleOpenReportProblem(order)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Report the Problem</span>
                              </button>

                              {/* Action: View Details */}
                              <button
                                onClick={() => handleOpenDetails(order)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span>View Details</span>
                              </button>

                              {/* Action: Tax Invoice */}
                              {order.invoiceAvailable && (
                                <button
                                  onClick={() => handleOpenInvoice(order)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-slate-500" />
                                  <span>Tax Invoice</span>
                                </button>
                              )}

                              {/* Action: Track Logistics */}
                              {order.trackingNumber && (
                                <button
                                  onClick={() => {
                                    setOpenMenuOrderId(null);
                                    navigate('/customer/shipments');
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                                >
                                  <Truck className="w-4 h-4 text-indigo-600" />
                                  <span>Track Logistics</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No delivered orders in history yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      When orders in the Order module reach "Delivered" fulfillment status, they will automatically be archived here.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => navigate('/customer/order')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                      >
                        Go to Order Module →
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report a Problem */}
      {reportOrder && (
        <Modal
          isOpen={reportProblemModalOpen}
          onClose={() => setReportProblemModalOpen(false)}
          title={`Report a Problem — Order #${reportOrder.orderNumber}`}
          subtitle="File an official discrepancy or damage report directly to the DHARM resolution team."
          maxWidth="lg"
        >
          {reportSuccessCase ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Problem Report Submitted
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Discrepancy case <strong>#{reportSuccessCase}</strong> has been logged and forwarded directly to <strong>Vendor Logistics (Exceptions & Damaged)</strong> and Quality Assurance for immediate intake.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportProblemModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmReportProblem} className="space-y-4">
              {reportError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}
              {/* Order Context Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Order Ref:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{reportOrder.orderNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">PO:</span>{' '}
                  <span className="font-semibold text-slate-700">{reportOrder.customerPoNumber || 'Direct Order'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Delivered On:</span>{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(reportOrder.expectedDeliveryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Affected Deliverable / SKU <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportProductId}
                  onChange={e => handleReportItemChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {reportOrder.items.map(item => (
                    <option key={item.productId} value={item.productId}>
                      {item.productName} ({item.sku}) — Delivered: {item.quantity} qty
                    </option>
                  ))}
                </select>
              </div>

              {/* Category & Resolution Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Problem Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportCategory}
                    onChange={e => setReportCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Damaged Goods">Damaged Goods / Packaging Crushed</option>
                    <option value="Missing Item">Missing Item / Quantity Shortage</option>
                    <option value="Quantity Mismatch">Quantity Mismatch</option>
                    <option value="Unexpected Product">Unexpected Product / SKU Mismatch</option>
                    <option value="Wrong Container">Wrong Container</option>
                    <option value="Conflicting Record">Conflicting Record</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Resolution <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportResolution}
                    onChange={e => setReportResolution(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Replacement">Immediate Replacement Dispatch</option>
                    <option value="Return">Authorize Return & Full Refund</option>
                    <option value="Assistance">Technical Inspection / Quality QA</option>
                  </select>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivered Units
                  </label>
                  <input
                    type="number"
                    disabled
                    value={reportExpectedQty}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Defective / Missing Units <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={reportExpectedQty}
                    value={reportObservedQty}
                    onChange={e => setReportObservedQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Problem Description & Observations <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Describe the defect, condition upon delivery, temperature readings, or package damage..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReportProblemModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:bg-rose-400"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{reportSubmitting ? 'Submitting...' : 'Submit Problem Report'}</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Modal: Order Details */}
      {selectedOrder && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Order Details: ${selectedOrder.orderNumber}`}
          subtitle={`Delivered on ${new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString('en-IN')}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Delivered
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Customer PO</span>
                <span className="font-mono font-bold text-slate-900">{selectedOrder.customerPoNumber || 'Direct Order'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Payment</span>
                <span className="font-bold text-emerald-600">{selectedOrder.paymentStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Grand Total</span>
                <span className="font-bold text-slate-900">{formatCurrency(selectedOrder.grandTotal)}</span>
              </div>
            </div>

            {/* Line items list */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Delivered Deliverables ({selectedOrder.items.length} SKUs)
              </span>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] font-mono text-indigo-600">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{item.quantity} qty</span>
                      <div className="text-[11px] text-slate-500">{formatCurrency(item.totalPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination Address */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Delivered To
              </span>
              <p className="font-semibold text-slate-800">{selectedOrder.shippingAddress.label}</p>
              <p className="text-slate-600">{selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.pinCode}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Official Tax Invoice */}
      {selectedOrder && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`GST Tax Invoice: ${selectedOrder.invoiceNumber || 'INV-2026-DHM'}`}
          subtitle={`Fiscal invoice copy for Delivered Order ${selectedOrder.orderNumber}`}
          maxWidth="2xl"
        >
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 text-xs">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-black text-slate-900 text-sm">DHARM ENTERPRISE TRACEABILITY ERP</h4>
                <p className="text-slate-500">GSTIN: 29AAACD1234F1Z5 • Karnataka, India</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-indigo-600">{selectedOrder.invoiceNumber}</span>
                <p className="text-slate-500">{new Date(selectedOrder.orderDate).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <div>
                <span className="text-slate-400 block">Billed To:</span>
                <span className="font-bold text-slate-800">{customerProfile.companyName || selectedOrder.customerName}</span>
                <p className="text-slate-600">GSTIN: {customerProfile.gstin || '29AABCB1234F1Z9'}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Invoice Total:</span>
                <span className="text-base font-extrabold text-slate-900">{formatCurrency(selectedOrder.grandTotal)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
