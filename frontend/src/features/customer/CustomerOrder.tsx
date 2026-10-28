import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { orderApi } from '../../services/orderApi';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  Filter,
  RotateCcw,
  Plus,
  Calendar,
  Truck,
  MoreVertical,
  AlertTriangle,
  Eye,
  FileText,
  XCircle,
  CheckCircle2,
  Trash2,
  Package,
  Building,
  MapPin,
  CreditCard,
  Download,
  Printer,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import type { Order, OrderStatus, DiscrepancyType, CustomerAddress } from '../../types';

export const CustomerOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    orders,
    refreshOrders,
    products,
    customerProfile,
    placeCustomerOrder,
    updateOrderStatus,
    cancelCustomerOrder,
    submitCustomerDiscrepancy,
    discrepancies
  } = useData();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Active Dropdowns state
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [openFulfillmentOrderId, setOpenFulfillmentOrderId] = useState<string | null>(null);

  // Modals State
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('Schedule change / Protocol revision.');
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  // Form State for "Add Order" Modal
  const [poReference, setPoReference] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    const def = customerProfile.savedAddresses?.find(a => a.isDefault);
    return def?.id || customerProfile.savedAddresses?.[0]?.id || 'addr-1';
  });
  const [logisticsProvider, setLogisticsProvider] = useState('Bluedart Express');
  const [paymentMethod, setPaymentMethod] = useState('Corporate Net Banking');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderLines, setOrderLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id || 'prod-001', quantity: 2 }
  ]);

  // ACTIVE Orders in fulfillment: exclude 'Delivered' orders (delivered orders go to Order History!)
  const activeOrders = useMemo(() => {
    return orders.filter(
      o => o.customerId === (user?.id || 'usr-cust-03') && o.status !== 'Delivered'
    );
  }, [orders, user?.id]);

  // Search & Filter Logic
  const filteredOrders = useMemo(() => {
    let result = [...activeOrders];

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

    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    return result;
  }, [activeOrders, search, statusFilter, customerProfile.companyName]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  // Add Order Form Calculations
  const activeProducts = useMemo(() => {
    return products.filter(p => p.status !== 'Archived' && p.status !== 'Inactive');
  }, [products]);

  const calculatedItems = useMemo(() => {
    return orderLines
      .map(line => {
        const product = products.find(p => p.id === line.productId);
        if (!product || line.quantity <= 0) return null;
        const effectiveGstRate = product.gstRate && product.gstRate > 0 ? (product.gstRate < 1 ? product.gstRate * 100 : product.gstRate) : 18;
        const lineSubtotal = product.unitPrice * line.quantity;
        const lineTax = Math.round(lineSubtotal * (effectiveGstRate / 100));
        const lineTotal = lineSubtotal + lineTax;

        return {
          product,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          image: (product as any).image || undefined,
          quantity: line.quantity,
          unitPrice: product.unitPrice,
          gstRate: effectiveGstRate,
          totalPrice: lineTotal
        };
      })
      .filter(Boolean) as Array<{
        product: typeof products[0];
        productId: string;
        productName: string;
        sku: string;
        image?: string;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        totalPrice: number;
      }>;
  }, [orderLines, products]);

  const modalSubtotal = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [calculatedItems]);

  const modalTaxTotal = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + Math.round((item.quantity * item.unitPrice) * (item.gstRate / 100)), 0);
  }, [calculatedItems]);

  const modalGrandTotal = modalSubtotal + modalTaxTotal;

  // Add / Remove line items in modal
  const handleAddLineItem = () => {
    const unselected = activeProducts.find(p => !orderLines.some(l => l.productId === p.id)) || activeProducts[0];
    if (unselected) {
      setOrderLines(prev => [...prev, { productId: unselected.id, quantity: 1 }]);
    }
  };

  const handleUpdateLine = (index: number, productId: string, quantity: number) => {
    setOrderLines(prev => {
      const copy = [...prev];
      copy[index] = { productId, quantity: Math.max(1, quantity) };
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    setOrderLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenAddOrder = () => {
    setPoReference(`PO-BIO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setOrderLines([{ productId: activeProducts[0]?.id || 'prod-001', quantity: 2 }]);
    setOrderRemarks('');
    setAddOrderModalOpen(true);
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedItems.length === 0) return;

    setIsSubmittingOrder(true);

    try {
      const targetAddress = customerProfile.savedAddresses?.find(a => a.id === selectedAddressId) || customerProfile.savedAddresses?.[0];

      placeCustomerOrder(
        {
          items: calculatedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            totalPrice: item.totalPrice
          })),
          customerPoNumber: poReference.trim() || 'Direct Commercial Order',
          logisticsProvider,
          shippingAddress: targetAddress as CustomerAddress,
          paymentMethod,
          notes: orderRemarks,
          customerId: user?.id || 'usr-cust-03',
          customerName: customerProfile.name || user?.name || 'Anusha S (BioMed)'
        },
        user?.name || 'Customer Consignee'
      );

      setAddOrderModalOpen(false);
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Fulfillment Action Menu: Status Changer & Delivery Flow
  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus, user?.name);
    setOpenFulfillmentOrderId(null);
    setOpenMenuOrderId(null);
  };

  // Action Menu Handlers
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
    setOpenMenuOrderId(null);
    setOpenFulfillmentOrderId(null);
  };

  const handleOpenInvoice = (order: Order) => {
    setSelectedOrder(order);
    setInvoiceModalOpen(true);
    setOpenMenuOrderId(null);
    setOpenFulfillmentOrderId(null);
  };

  const handleOpenCancel = (order: Order) => {
    setSelectedOrder(order);
    setCancelError(null);
    setCancellationReason('Schedule change / Protocol revision.');
    setCancelModalOpen(true);
    setOpenMenuOrderId(null);
    setOpenFulfillmentOrderId(null);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      cancelCustomerOrder(
        selectedOrder.id,
        cancellationReason,
        user?.name || 'Customer'
      );
      setCancelModalOpen(false);
      setDetailsModalOpen(false);
    } catch (err: any) {
      setCancelError(err.message || 'Unable to cancel order.');
    }
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
    setOpenFulfillmentOrderId(null);
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
          description: reportDescription || `Problem reported by customer for order ${reportOrder.orderNumber}: ${reportCategory}.`,
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

  // Helper for fulfillment status pill styling
  const renderFulfillmentBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Processing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
            Processing
          </span>
        );
      case 'Confirmed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
            Confirmed
          </span>
        );
      case 'Dispatched':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
            Shipped
          </span>
        );
      case 'Delivered':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-block">
            Cancelled
          </span>
        );
      case 'Placed':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-block">
            Placed
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search, Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search active orders by order #, PO #, account..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Filter Funnel Button */}
          <div className="relative">
            <button
              onClick={() => {
                setFilterDropdownOpen(!filterDropdownOpen);
                setOpenFulfillmentOrderId(null);
                setOpenMenuOrderId(null);
              }}
              className={`p-2.5 rounded-xl border transition cursor-pointer shadow-2xs ${
                statusFilter !== 'ALL'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-500'
              }`}
              title="Filter by status"
            >
              <Filter className="w-4 h-4" />
            </button>

            {filterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setFilterDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 py-1">
                    Active Statuses
                  </span>
                  {/* Dispatched commented out per request */}
                  {(['ALL', 'Placed', 'Confirmed', 'Processing', /* 'Dispatched', */ 'Cancelled'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st as any);
                        setFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        statusFilter === st
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'ALL' ? 'All Active Orders' : st}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="p-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-500 rounded-xl transition cursor-pointer shadow-2xs"
            title="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: + Add Order Button */}
        <button
          onClick={handleOpenAddOrder}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Order</span>
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
                  Fulfillment (Action Menu)
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
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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

                    {/* FULFILLMENT: Interactive Action Menu! */}
                    <td className="py-4 px-4 align-top">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => {
                            setOpenFulfillmentOrderId(openFulfillmentOrderId === order.id ? null : order.id);
                            setOpenMenuOrderId(null);
                          }}
                          className="flex items-center gap-1.5 p-1 rounded-full transition hover:bg-slate-100 cursor-pointer group"
                          title="Click to update fulfillment status"
                        >
                          {renderFulfillmentBadge(order.status)}
                          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition" />
                        </button>

                        {openFulfillmentOrderId === order.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenFulfillmentOrderId(null)} />
                            <div className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1 border-b border-slate-100">
                                Change Fulfillment
                              </span>

                              <button
                                onClick={() => handleStatusChange(order, 'Placed')}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${order.status === 'Placed' ? 'text-amber-700 bg-amber-50/50' : 'text-slate-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span>Placed</span>
                                </div>
                                {order.status === 'Placed' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                              </button>

                              <button
                                onClick={() => handleStatusChange(order, 'Confirmed')}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${order.status === 'Confirmed' ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                  <span>Confirmed</span>
                                </div>
                                {order.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                              </button>

                              <button
                                onClick={() => handleStatusChange(order, 'Processing')}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${order.status === 'Processing' ? 'text-sky-700 bg-sky-50/50' : 'text-slate-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                                  <span>Processing</span>
                                </div>
                                {order.status === 'Processing' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                              </button>

                              {/* Shipped (Dispatched) commented out per request */}
                              {/*
                              <button
                                onClick={() => handleStatusChange(order, 'Dispatched')}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 transition cursor-pointer ${order.status === 'Dispatched' ? 'text-blue-700 bg-blue-50/50' : 'text-slate-700'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span>Shipped (Dispatched)</span>
                                </div>
                                {order.status === 'Dispatched' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              */}

                              {/* MARK AS DELIVERED -> Moves to Order History! */}
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => handleStatusChange(order, 'Delivered')}
                                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer bg-emerald-50/30"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Mark as Delivered</span>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  Moves to History ➜
                                </span>
                              </button>

                              <button
                                onClick={() => handleStatusChange(order, 'Cancelled')}
                                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer border-t border-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span>Cancelled</span>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Actions Menu (⋮) */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => {
                            setOpenMenuOrderId(openMenuOrderId === order.id ? null : order.id);
                            setOpenFulfillmentOrderId(null);
                          }}
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
                            {/* Action: Mark as Delivered (Direct Flow) */}
                            <button
                              onClick={() => handleStatusChange(order, 'Delivered')}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer border-b border-slate-100"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Mark as Delivered ➜</span>
                            </button>

                            {/* Action: Report a Problem */}
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
                                <span>Track Shipment</span>
                              </button>
                            )}

                            {/* Action: Cancel Order */}
                            {order.canCancel && (
                              <button
                                onClick={() => handleOpenCancel(order)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer border-t border-slate-100 mt-1 pt-2"
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span>Cancel Order</span>
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
                    <p className="font-bold text-slate-700 text-sm">No active orders in fulfillment</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All orders have been delivered to your facility and archived to Order History, or click "Add Order" to create one.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => navigate('/customer/orders')}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        View Order History →
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Order */}
      <Modal
        isOpen={addOrderModalOpen}
        onClose={() => setAddOrderModalOpen(false)}
        title="Add New Purchase Order"
        subtitle="Specify deliverables, PO reference, delivery location, and submit directly to the ERP."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateOrderSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Account
              </label>
              <input
                type="text"
                disabled
                value={`${customerProfile.companyName || 'BioMed Diagnostics'} (${customerProfile.name || 'Anusha S'})`}
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold"
              />
            </div>

            {/* Customer PO Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer PO Reference <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={poReference}
                onChange={e => setPoReference(e.target.value)}
                placeholder="e.g. PO-BIO-2026-0812"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Delivery Destination */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery Location
              </label>
              <select
                value={selectedAddressId}
                onChange={e => setSelectedAddressId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {customerProfile.savedAddresses && customerProfile.savedAddresses.length > 0 ? (
                  customerProfile.savedAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label} — {addr.city}, {addr.state}
                    </option>
                  ))
                ) : (
                  <option value="addr-1">Primary Receiving Annex — Bengaluru</option>
                )}
              </select>
            </div>

            {/* Logistics Provider */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logistics Carrier
              </label>
              <select
                value={logisticsProvider}
                onChange={e => setLogisticsProvider(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Bluedart Express">Bluedart Express</option>
                <option value="DTDC Express">DTDC Express</option>
                <option value="FedEx Healthcare">FedEx Healthcare Logistics</option>
                <option value="Trans-Express Cold-Chain">Trans-Express Cold-Chain</option>
              </select>
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Order Deliverables ({orderLines.length} item{orderLines.length > 1 ? 's' : ''})
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deliverable</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {orderLines.map((line, idx) => {
                const itemProduct = products.find(p => p.id === line.productId) || products[0];
                const itemTotal = itemProduct ? itemProduct.unitPrice * line.quantity : 0;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <select
                        value={line.productId}
                        onChange={e => handleUpdateLine(idx, e.target.value, line.quantity)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      >
                        {activeProducts.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.sku}) — {formatCurrency(prod.unitPrice)}/ea
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => handleUpdateLine(idx, line.productId, parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-center focus:ring-2 focus:ring-indigo-500"
                        title="Quantity"
                      />
                    </div>

                    <div className="w-28 text-right font-extrabold text-slate-900 pr-1">
                      {formatCurrency(itemTotal)}
                    </div>

                    {orderLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Corporate Net Banking">Corporate Net Banking</option>
                <option value="Purchase Order (30-Day Credit)">Purchase Order (30-Day Net Credit)</option>
                <option value="NEFT / RTGS Wire">NEFT / RTGS Wire Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Order Remarks / Clinical Note
              </label>
              <input
                type="text"
                value={orderRemarks}
                onChange={e => setOrderRemarks(e.target.value)}
                placeholder="e.g. Expedited shipment for laboratory cold bay"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Totals Bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Subtotal:</span>{' '}
              <span className="font-semibold text-slate-700">{formatCurrency(modalSubtotal)}</span>
              <span className="text-slate-400 mx-2">|</span>
              <span className="text-slate-500">GST:</span>{' '}
              <span className="font-semibold text-slate-700">{formatCurrency(modalTaxTotal)}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-2">Grand Total:</span>
              <span className="text-base font-extrabold text-indigo-600">
                {formatCurrency(modalGrandTotal)}
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddOrderModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingOrder || calculatedItems.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:bg-indigo-400"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmittingOrder ? 'Adding Order...' : 'Confirm & Place Order'}</span>
            </button>
          </div>
        </form>
      </Modal>

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
                  <span className="text-slate-400">Date:</span>{' '}
                  <span className="font-semibold text-slate-700">
                    {new Date(reportOrder.orderDate).toLocaleDateString('en-IN', {
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
                      {item.productName} ({item.sku}) — Ordered: {item.quantity} qty
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
                    Expected / Invoiced Units
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
                  placeholder="Describe the discrepancy, observable physical defects, cold-chain temperature readings, or packaging condition upon arrival..."
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
          subtitle={`Placed on ${new Date(selectedOrder.orderDate).toLocaleDateString('en-IN')}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <span className="font-bold text-slate-900">{selectedOrder.status}</span>
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
                Deliverables ({selectedOrder.items.length} SKUs)
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
                Destination Address
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
          subtitle={`Fiscal invoice copy for Order ${selectedOrder.orderNumber}`}
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

      {/* Modal: Cancel Order */}
      {selectedOrder && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title={`Cancel Order: ${selectedOrder.orderNumber}`}
          subtitle="Cancellation is permitted while the order is in Placed or Processing stage."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4">
            {cancelError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Are you sure you want to cancel this order?</p>
              <p className="text-amber-800 mt-0.5">
                Warehouse allocation for {selectedOrder.items.length} product lines will be released back to available inventory.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                placeholder="State reason (e.g. Clinical schedule revision, accidental duplicate order)..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
