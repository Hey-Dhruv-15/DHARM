import type { Shipment, ShipmentStatus } from '../types';

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

// ==========================================
// Types
// ==========================================
export interface EntityReference {
  id: number | string;
  name: string;
}

export interface ProductLineDetail {
  product_id?: number | string;
  product_code: string;
  product_name: string;
  container_id?: string;
  expected_quantity?: number;
  expected: number;
  verified_quantity?: number;
  verified: number;
  variance: number;
  status: 'mismatch' | 'verified' | string;
}

export interface DiscrepancyReportItem {
  discrepancy_id: string;
  product_code: string;
  expected_quantity: number;
  received_quantity: number;
  variance: number;
  type: string;
  status: string;
  message: string;
}

export interface ShipmentTimelineEvent {
  event_type: string;
  location: string;
  performed_by: string;
  timestamp: string;
  notes?: string;
}

export interface ShipmentListItem {
  shipment_id: string;
  tracking_id: string;
  origin_hub: string;
  destination_bay: string;
  container_id?: string;
  assigned_vendor: EntityReference;
  recipient_customer: EntityReference;
  product_lines: number;
  expected_units: number;
  verified_units: number;
  status: string;
  discrepancy_count: number;
  created_at: string;
}

export interface ShipmentDetailData {
  shipment_id: string;
  tracking_id: string;
  origin_hub: string;
  destination_bay: string;
  container?: { id: string; name: string };
  container_id?: string;
  assigned_vendor: EntityReference;
  recipient_customer: EntityReference;
  status: string;
  handling_notes?: string;
  manifest_locked: boolean;
  expected_units: number;
  verified_units: number;
  product_lines: ProductLineDetail[];
  discrepancies: DiscrepancyReportItem[];
  events: ShipmentTimelineEvent[];
  open_discrepancies: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateShipmentManifestPayload {
  origin_hub: string;
  destination_bay: string;
  vendor_id: number | string;
  customer_id: number | string;
  container_id: string;
  handling_notes?: string;
  items: Array<{
    product_id: number | string;
    expected_quantity: number;
  }>;
}

export interface OwnerScanResponse {
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    barcode: string;
    product_id: number | string;
    product_code: string;
    product_name: string;
    container_id?: string;
    packed_quantity: number;
    expected_quantity: number;
    remaining_quantity: number;
    packing_status: string;
  };
}

export interface VendorScanResponse {
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    barcode: string;
    product_code: string;
    expected_quantity: number;
    received_quantity: number;
    remaining_quantity: number;
    shipment_status: string;
    scan_status: string;
  };
}

export interface CompleteReceivingPayload {
  container_id: string;
  confirmation?: boolean;
  checkpoint_location: string;
  notes?: string;
}

export interface CompleteReceivingResponse {
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    tracking_id?: string;
    status: string;
    expected_units: number;
    received_units: number;
    shortage_units: number;
    overage_units: number;
    discrepancy_count: number;
    discrepancies: Array<{
      discrepancy_id: string;
      product_id: number | string;
      product_code: string;
      product_name: string;
      container_id?: string;
      expected_quantity: number;
      received_quantity: number;
      variance: number;
      type: string;
      status: string;
      message: string;
    }>;
    notifications?: Record<string, string>;
  };
}

export interface ReconciliationLine {
  product_code: string;
  expected_quantity: number;
  verified_quantity: number;
  variance: number;
  status: 'shortage' | 'overage' | 'matched' | string;
}

export interface ReconciliationResponse {
  success: boolean;
  data: {
    shipment_id: string;
    reconciliation_status: string;
    expected_units: number;
    verified_units: number;
    variance_units: number;
    lines: ReconciliationLine[];
    generated_at: string;
  };
}

export interface FulfillmentUpdatePayload {
  status: string;
  checkpoint_location: string;
  notes?: string;
}

export interface DiscrepancyResolutionPayload {
  resolution_status: 'Investigating' | 'Resolved' | 'Escalated' | 'Closed' | string;
  resolution_type?: 'Inventory Adjusted' | 'Vendor Reimbursed' | 'Supplier Credit Issued' | 'Goods Found' | string;
  notes?: string;
}

// ==========================================
// API Client Functions
// ==========================================

/**
 * GET All Shipments: /api/v1/shipments
 */
export const listShipments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  vendor_id?: string;
  customer_id?: string;
  owner_id?: string;
}): Promise<{
  success: boolean;
  data: ShipmentListItem[];
  pagination: { page: number; limit: number; total_records: number; total_pages: number };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.vendor_id) query.set('vendor_id', params.vendor_id);
  if (params?.customer_id) query.set('customer_id', params.customer_id);
  if (params?.owner_id) query.set('owner_id', params.owner_id);

  const res = await fetch(`${getBaseUrl()}/api/v1/shipments?${query.toString()}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch shipments (${res.status})`);
  }

  return res.json();
};

/**
 * GET Shipment Details: /api/v1/shipments/{shipment_id}
 */
export const getShipmentDetails = async (shipmentId: string): Promise<{ success: boolean; data: ShipmentDetailData }> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch shipment details (${res.status})`);
  }

  return res.json();
};

/**
 * Track Shipment by Tracking Number: /api/v1/shipments/track/{tracking_number}
 */
export const trackShipment = async (trackingNumber: string): Promise<any> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/track/${encodeURIComponent(trackingNumber)}`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to track shipment (${res.status})`);
  }

  return res.json();
};

/**
 * GET Reconciliation Report: /api/v1/shipments/{shipment_id}/reconciliation
 */
export const getReconciliationDetails = async (shipmentId: string): Promise<ReconciliationResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/reconciliation`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch reconciliation report (${res.status})`);
  }

  return res.json();
};

/**
 * POST Create Shipment Manifest: /api/v1/shipments
 */
export const createShipmentManifest = async (payload: CreateShipmentManifestPayload): Promise<{
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    tracking_id: string;
    status: string;
    manifest_locked: boolean;
    container_id: string;
    expected_units: number;
    product_lines: number;
    created_at: string;
  };
}> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to create shipment manifest (${res.status})`);
  }

  return res.json();
};

/**
 * POST Owner Scans Barcode: /api/v1/shipments/{shipment_id}/owner-scans
 */
export const ownerScanBarcode = async (
  shipmentId: string,
  barcode: string,
  containerId?: string
): Promise<OwnerScanResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/owner-scans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ barcode, container_id: containerId })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to record owner scan (${res.status})`);
  }

  return res.json();
};

/**
 * POST Dispatch Shipment: /api/v1/shipments/{shipment_id}/dispatch
 */
export const dispatchShipmentManifest = async (
  shipmentId: string,
  payload: {
    container_id: string;
    checkpoint_location: string;
    seal_number: string;
    notes?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    tracking_id: string;
    status: string;
    manifest_locked: boolean;
    expected_units: number;
    dispatched_at: string;
  };
}> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/dispatch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to dispatch shipment (${res.status})`);
  }

  return res.json();
};

/**
 * POST Vendor Scans Received Product: /api/v1/shipments/{shipment_id}/vendor-scans
 */
export const vendorScanBarcode = async (
  shipmentId: string,
  barcode: string,
  containerId?: string
): Promise<VendorScanResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/vendor-scans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ barcode, container_id: containerId })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to record vendor scan (${res.status})`);
  }

  return res.json();
};

/**
 * POST Complete Receiving and Reconcile: /api/v1/shipments/{shipment_id}/complete-receiving
 * Evaluates physical verification count vs expected manifest.
 * Automatically flags product loss/shortages and creates discrepancy records.
 */
export const completeReceivingAndReconcile = async (
  shipmentId: string,
  payload: CompleteReceivingPayload
): Promise<CompleteReceivingResponse> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/complete-receiving`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      container_id: payload.container_id,
      confirmation: payload.confirmation ?? true,
      checkpoint_location: payload.checkpoint_location || 'Receiving Dock',
      notes: payload.notes
    })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to complete receiving (${res.status})`);
  }

  return res.json();
};

/**
 * POST Update Fulfillment Status: /api/v1/shipments/{shipment_id}/fulfillment
 */
export const updateFulfillmentStatus = async (
  shipmentId: string,
  payload: FulfillmentUpdatePayload
): Promise<{
  success: boolean;
  message: string;
  data: {
    shipment_id: string;
    status: string;
    checkpoint_location: string;
    updated_at: string;
  };
}> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/fulfillment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to update fulfillment (${res.status})`);
  }

  return res.json();
};

/**
 * PATCH Resolve Discrepancy: /api/v1/shipments/{shipment_id}/discrepancies/{discrepancy_id}
 */
export const resolveShipmentDiscrepancy = async (
  shipmentId: string,
  discrepancyId: string,
  payload: DiscrepancyResolutionPayload
): Promise<any> => {
  const res = await fetch(
    `${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/discrepancies/${encodeURIComponent(discrepancyId)}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to resolve discrepancy (${res.status})`);
  }

  return res.json();
};

/**
 * PUT / PATCH Update Shipment: /api/v1/shipments/{shipment_id}
 */
export const updateShipmentPut = async (shipmentId: string, payload: any): Promise<any> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to update shipment (${res.status})`);
  }

  return res.json();
};

export const updateShipmentPatch = async (shipmentId: string, payload: any): Promise<any> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to patch shipment (${res.status})`);
  }

  return res.json();
};

/**
 * PUT Update Shipment Status Legacy: /api/v1/shipments/{shipment_id}/status
 */
export const updateShipmentStatusLegacy = async (
  shipmentId: string,
  status: string,
  location?: string,
  notes?: string
): Promise<any> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/${encodeURIComponent(shipmentId)}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, location, notes })
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to update shipment status (${res.status})`);
  }

  return res.json();
};

/**
 * POST Dispatch Outbound Customer Delivery: /api/v1/shipments/outbound
 */
export const dispatchOutboundDelivery = async (payload: {
  order_id: string;
  customer_id: string;
  origin_facility?: string;
  destination_bay?: string;
  carrier: string;
  tracking_number?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    sku?: string;
    quantity: number;
    unit_price?: number;
  }>;
}): Promise<any> => {
  const res = await fetch(`${getBaseUrl()}/api/v1/shipments/outbound`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to dispatch outbound delivery (${res.status})`);
  }

  return res.json();
};
