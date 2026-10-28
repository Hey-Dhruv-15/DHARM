import type { Order, OrderItem, OrderStatus, PaymentStatus } from '../types';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000') return '';
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
};

const getAuthHeaders = (): HeadersInit => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dharm_access_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface CreateOrderPayload {
  customerPoReference: string;
  deliveryLocation?: string;
  logisticsCarrier?: string;
  paymentTerms?: string;
  orderRemarks?: string;
  customerId?: string;
  customerName?: string;
  customerAccount?: string;
  shippingAddress?: any;
  billingAddress?: any;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    gstRate?: number;
    totalPrice?: number;
  }>;
}

export interface ReportProblemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  problemCategory: string;
  preferredResolution?: string;
  deliveredUnits?: number;
  defectiveUnits?: number;
  description: string;
  evidencePhotos?: string[];
}

export interface OrderDeliverResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber: string;
  status: string;
  deliveredAt: string;
  archivedToHistory: boolean;
  historyId: string;
  history?: any;
}

export interface VendorExceptionResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber: string;
  customerPoReference?: string;
  discrepancyId: string;
  discrepancyNumber: string;
  returnId: string;
  returnNumber: string;
  vendorModule: string;
  targetQuarantineBay: string;
  productName: string;
  sku?: string;
  defectiveUnits: number;
  problemCategory: string;
  customerResolutionPreference: string;
  vendorVerificationPending: boolean;
  createdAt: string;
}

/**
 * Normalize an order object received from FastAPI into frontend Order shape
 */
export const normalizeOrder = (raw: any): Order => {
  const items: OrderItem[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        productId: it.productId || it.product_id || '',
        productName: it.productName || it.product_name || 'Standard Item',
        sku: it.sku || 'SKU-000',
        image: it.image || undefined,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
        gstRate: Number(it.gstRate ?? it.gst_rate ?? 0.18),
        totalPrice: Number(it.totalPrice ?? it.total_price ?? (it.unit_price * it.quantity * 1.18))
      }))
    : [];

  const defaultShipping = {
    id: 'addr-default',
    label: raw.deliveryLocation ? raw.deliveryLocation.split('—')[0]?.trim() : 'Primary Receiving Dock',
    street: raw.deliveryLocation || 'Phase II Industrial Annex',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560100',
    country: 'India',
    isDefault: true
  };

  const defaultBilling = {
    companyName: raw.customerAccount || raw.customerName || 'BioMed Diagnostics',
    gstin: '29AABCB2207R1ZT',
    pan: 'AABCB2207R',
    street: 'Corporate Tower A',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560100',
    country: 'India'
  };

  return {
    id: raw.id || `ord-${Date.now()}`,
    orderNumber: raw.orderNumber || raw.order_number || `ORD-DHM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: raw.customerId || raw.customer_id || 'usr-cust-03',
    customerName: raw.customerName || raw.customer_name || 'Anusha S (BioMed)',
    orderDate: raw.orderDate || raw.order_date || raw.createdAt || raw.created_at || new Date().toISOString(),
    status: (raw.status as OrderStatus) || 'Placed',
    expectedDeliveryDate: raw.expectedDeliveryDate || raw.expected_delivery_date || new Date(Date.now() + 4 * 86400000).toISOString(),
    paymentStatus: (raw.paymentStatus || raw.payment_status || 'Paid') as PaymentStatus,
    paymentMethod: raw.paymentTerms || raw.payment_terms || raw.paymentMethod || 'Corporate Net Banking',
    items,
    subtotal: Number(raw.subtotal ?? 0),
    taxTotal: Number(raw.taxTotal ?? raw.tax_total ?? 0),
    grandTotal: Number(raw.grandTotal ?? raw.grand_total ?? (raw.subtotal + (raw.tax_total || 0))),
    shippingAddress: raw.shippingAddress || raw.shipping_address || defaultShipping,
    billingAddress: raw.billingAddress || raw.billing_address || defaultBilling,
    customerPoNumber: raw.customerPoReference || raw.customer_po_reference || raw.customerPoNumber || 'Direct Commercial Order',
    logisticsProvider: raw.logisticsCarrier || raw.logistics_carrier || raw.logisticsProvider || 'Bluedart Express',
    shipmentId: raw.shipmentId || raw.shipment_id || undefined,
    trackingNumber: raw.trackingNumber || raw.tracking_number || undefined,
    invoiceNumber: raw.invoiceNumber || raw.invoice_number || undefined,
    invoiceAvailable: raw.invoiceAvailable ?? raw.invoice_available ?? true,
    canCancel: raw.canCancel ?? raw.can_cancel ?? (raw.status !== 'Dispatched' && raw.status !== 'Delivered' && raw.status !== 'Cancelled'),
    cancellationReason: raw.cancellationReason || raw.cancellation_reason,
    cancelledAt: raw.cancelledAt || raw.cancelled_at
  };
};

export const orderApi = {
  /**
   * GET /api/orders/
   * List purchase orders with optional customer, status, search, and active_only filters
   */
  async listOrders(filters?: {
    customerId?: string;
    status?: string;
    search?: string;
    activeOnly?: boolean;
  }): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customer_id', filters.customerId);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.activeOnly !== undefined) params.append('active_only', String(filters.activeOnly));

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const endpoints = [
      `/api/orders${queryStr}`,
      `${getBaseUrl()}/api/orders${queryStr}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data.map(normalizeOrder);
          }
        }
      } catch (err) {
        // Fallback to next endpoint
      }
    }
    throw new Error('Failed to fetch orders from backend API');
  },

  /**
   * GET /api/orders/{id}
   * Fetch single purchase order details by ID or Order Number
   */
  async getOrder(id: string): Promise<Order> {
    const endpoints = [
      `/api/orders/${encodeURIComponent(id)}`,
      `${getBaseUrl()}/api/orders/${encodeURIComponent(id)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          return normalizeOrder(data);
        }
      } catch (err) {
        // Fallback
      }
    }
    throw new Error(`Order ${id} not found`);
  },

  /**
   * POST /api/orders/
   * Create a new purchase order directly in the ERP
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const endpoints = [
      `/api/orders/`,
      `/api/orders`,
      `${getBaseUrl()}/api/orders/`,
      `${getBaseUrl()}/api/orders`
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            customerAccount: payload.customerAccount,
            customerPoReference: payload.customerPoReference,
            deliveryLocation: payload.deliveryLocation,
            logisticsCarrier: payload.logisticsCarrier || 'Bluedart Express',
            paymentTerms: payload.paymentTerms || 'Corporate Net Banking',
            orderRemarks: payload.orderRemarks,
            customerId: payload.customerId,
            customerName: payload.customerName,
            shippingAddress: payload.shippingAddress,
            billingAddress: payload.billingAddress,
            items: payload.items.map(it => ({
              productId: it.productId,
              productName: it.productName,
              sku: it.sku,
              image: it.image,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              gstRate: it.gstRate && it.gstRate > 1 ? it.gstRate / 100 : (it.gstRate ?? 0.18),
              totalPrice: it.totalPrice
            }))
          })
        });

        if (res.ok) {
          const data = await res.json();
          return normalizeOrder(data);
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to create order on backend');
  },

  /**
   * PUT /api/orders/{id}/status
   * Update the fulfillment lifecycle status of a purchase order
   */
  async updateOrderStatus(id: string, status: string, notes?: string): Promise<Order> {
    const endpoints = [
      `/api/orders/${encodeURIComponent(id)}/status`,
      `${getBaseUrl()}/api/orders/${encodeURIComponent(id)}/status`
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, notes })
        });
        if (res.ok) {
          const data = await res.json();
          return normalizeOrder(data);
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to update status for order ${id}`);
  },

  /**
   * PUT /api/orders/{id}/deliver
   * Action API: Mark Order as Delivered (removes from active queue, archives to Order History)
   */
  async markOrderAsDelivered(
    id: string,
    deliveryInfo?: { notes?: string; deliveredBy?: string }
  ): Promise<OrderDeliverResponse> {
    const endpoints = [
      `/api/orders/${encodeURIComponent(id)}/deliver`,
      `${getBaseUrl()}/api/orders/${encodeURIComponent(id)}/deliver`
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            notes: deliveryInfo?.notes || 'Customer confirmed delivery at primary receiving dock.',
            deliveredBy: deliveryInfo?.deliveredBy || 'Customer Consignee'
          })
        });
        if (res.ok) {
          const data = await res.json();
          return data as OrderDeliverResponse;
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to deliver order ${id}`);
  },

  /**
   * POST /api/orders/{id}/cancel
   * Cancel a customer purchase order prior to dispatch
   */
  async cancelOrder(id: string, reason: string): Promise<Order> {
    const endpoints = [
      `/api/orders/${encodeURIComponent(id)}/cancel`,
      `${getBaseUrl()}/api/orders/${encodeURIComponent(id)}/cancel`
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason })
        });
        if (res.ok) {
          const data = await res.json();
          return normalizeOrder(data);
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to cancel order ${id}`);
  },

  /**
   * POST /api/orders/{id}/report-problem
   * Action API: Report a Problem for an order item.
   * Creates an official Discrepancy Case and Return Case routed to Vendor Exceptions & Damaged module.
   */
  async reportOrderProblem(id: string, report: ReportProblemPayload): Promise<VendorExceptionResponse> {
    const endpoints = [
      `/api/orders/${encodeURIComponent(id)}/report-problem`,
      `${getBaseUrl()}/api/orders/${encodeURIComponent(id)}/report-problem`
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            productId: report.productId,
            productName: report.productName,
            sku: report.sku,
            problemCategory: report.problemCategory,
            preferredResolution: report.preferredResolution || 'Replacement',
            deliveredUnits: report.deliveredUnits || 1,
            defectiveUnits: report.defectiveUnits || 1,
            description: report.description,
            evidencePhotos: report.evidencePhotos || []
          })
        });
        if (res.ok) {
          const data = await res.json();
          return data as VendorExceptionResponse;
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to report problem for order ${id}`);
  },

  /**
   * GET /api/orders/history
   * Retrieve all archived Delivered orders from Order History
   */
  async listOrderHistory(customerId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId);
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    const endpoints = [
      `/api/orders/history${queryStr}`,
      `${getBaseUrl()}/api/orders/history${queryStr}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Fallback
      }
    }
    return [];
  }
};

