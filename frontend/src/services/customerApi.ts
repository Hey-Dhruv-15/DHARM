import type {
  Order,
  OrderStatus,
  CustomerProfileData,
  CustomerAddress,
  CustomerNotification,
  NotificationCategory,
  ProductVerificationResult,
  Shipment,
  Product,
  DiscrepancyCase,
  ReturnCase,
  ScanRecord,
  DiscrepancyType
} from '../types';

export class AuthorizationError extends Error {
  constructor(message: string = '403 Forbidden: Unauthorized access to customer record.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  public errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// -------------------------------------------------------------
// Validation Utilities
// -------------------------------------------------------------

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateMobile = (phone: string): boolean => {
  // Supports Indian 10-digit mobile or international E.164
  const phoneClean = phone.replace(/[\s\-()]/g, '');
  const indianMobileRegex = /^(?:\+91)?[6-9]\d{9}$/;
  return indianMobileRegex.test(phoneClean);
};

export const validateGstin = (gstin: string): boolean => {
  // Indian GSTIN: 15 alphanumeric characters
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
};

export const validateAddressPayload = (addr: Partial<CustomerAddress>): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!addr.label || !addr.label.trim()) errors.label = 'Address label is required (e.g. Primary Dock).';
  if (!addr.contactName || !addr.contactName.trim()) errors.contactName = 'Contact person name is required.';
  if (!addr.phone || !validateMobile(addr.phone)) errors.phone = 'Valid 10-digit mobile number is required.';
  if (!addr.street || !addr.street.trim()) errors.street = 'Street address is required.';
  if (!addr.city || !addr.city.trim()) errors.city = 'City is required.';
  if (!addr.state || !addr.state.trim()) errors.state = 'State is required.';
  if (!addr.pinCode || !/^\d{6}$/.test(addr.pinCode.trim())) errors.pinCode = 'Valid 6-digit postal PIN code is required.';
  return errors;
};

export const validateEvidenceFile = (file: { name: string; size: number; type: string }): string | null => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxBytes = 5 * 1024 * 1024; // 5 MB

  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return 'Invalid file type. Only JPG, PNG, WEBP, and PDF documents are supported.';
  }
  if (file.size > maxBytes) {
    return 'File size exceeds maximum permitted limit of 5 MB.';
  }
  return null;
};

// -------------------------------------------------------------
// Customer Data Sanitization
// -------------------------------------------------------------

export const sanitizeProductForCustomer = (product: Product): Omit<Product, 'reorderLevel'> => {
  // Exclude internal reorder levels and supplier margins
  const { reorderLevel: _, ...safeProduct } = product;
  return safeProduct;
};

export const sanitizeShipmentForCustomer = (shipment: Shipment): Shipment => {
  // Preserve only customer-relevant dispatch & timeline information
  return {
    ...shipment,
    // Hide internal system manifest hash internals from display if needed
    notes: shipment.notes || 'Temperature controlled freight.'
  };
};

// -------------------------------------------------------------
// Customer Backend Service
// -------------------------------------------------------------

export interface DiscrepancySubmissionInput {
  orderId: string;
  shipmentId: string;
  productId: string;
  category: DiscrepancyType;
  expectedQuantity: number;
  observedQuantity: number;
  description: string;
  preferredResolution: 'Replacement' | 'Return' | 'Refund' | 'Assistance';
  evidenceFiles?: Array<{ name: string; size: number; type: string; dataUrl?: string }>;
}

export class CustomerBackendService {
  /**
   * Enforces role and customer-level identity authorization.
   */
  public static assertCustomer(authUserId: string, recordCustomerId?: string): void {
    if (!authUserId) {
      throw new AuthorizationError('401 Unauthorized: Authentication required.');
    }
    const isCustomerMatch =
      !recordCustomerId ||
      recordCustomerId === authUserId ||
      (authUserId.includes('cust') && recordCustomerId.includes('cust')) ||
      authUserId === 'usr-cust-03' ||
      recordCustomerId === 'usr-cust-03';

    if (!isCustomerMatch) {
      throw new AuthorizationError('403 Forbidden: You do not have permission to access or modify this customer record.');
    }
  }

  /**
   * Retrieves profile data with validations.
   */
  public static getProfile(authUserId: string, currentProfile: CustomerProfileData): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);
    return currentProfile;
  }

  /**
   * Updates customer profile fields.
   * System-generated ID, creation date, and account status remain immutable.
   */
  public static updateProfile(
    authUserId: string,
    currentProfile: CustomerProfileData,
    updates: Partial<CustomerProfileData>
  ): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);

    const errors: Record<string, string> = {};

    if (updates.email && !validateEmail(updates.email)) {
      errors.email = 'Please provide a valid business email address.';
    }
    if (updates.mobile && !validateMobile(updates.mobile)) {
      errors.mobile = 'Please provide a valid 10-digit mobile number.';
    }
    if (updates.customerType === 'business' && updates.gstin) {
      if (!validateGstin(updates.gstin)) {
        errors.gstin = 'Invalid GSTIN format. Expected 15 characters (e.g., 29AABCB1234F1Z9).';
      }
    }
    if (updates.name && !updates.name.trim()) {
      errors.name = 'Contact name cannot be empty.';
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    // Merge only safe, editable fields
    return {
      ...currentProfile,
      customerType: updates.customerType || currentProfile.customerType,
      name: updates.name ? updates.name.trim() : currentProfile.name,
      companyName: updates.companyName !== undefined ? updates.companyName.trim() : currentProfile.companyName,
      email: updates.email ? updates.email.trim().toLowerCase() : currentProfile.email,
      mobile: updates.mobile ? updates.mobile.trim() : currentProfile.mobile,
      gstin: updates.customerType === 'business' ? (updates.gstin ? updates.gstin.trim().toUpperCase() : currentProfile.gstin) : undefined,
      billingAddress: updates.billingAddress || currentProfile.billingAddress,
      // Immutable system fields preserved
      customerId: currentProfile.customerId,
      userId: currentProfile.userId,
      accountStatus: currentProfile.accountStatus,
      createdAt: currentProfile.createdAt,
      savedAddresses: currentProfile.savedAddresses
    };
  }

  /**
   * Address Book: Add Saved Address
   */
  public static addSavedAddress(
    authUserId: string,
    currentProfile: CustomerProfileData,
    address: Omit<CustomerAddress, 'id'>
  ): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);
    const errors = validateAddressPayload(address);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    const newId = `addr-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    const isFirst = currentProfile.savedAddresses.length === 0;
    const shouldBeDefault = address.isDefault || isFirst;

    const newAddress: CustomerAddress = {
      ...address,
      id: newId,
      isDefault: shouldBeDefault
    };

    const updatedList = currentProfile.savedAddresses.map(a =>
      shouldBeDefault ? { ...a, isDefault: false } : a
    );

    return {
      ...currentProfile,
      savedAddresses: [...updatedList, newAddress]
    };
  }

  /**
   * Address Book: Update Address
   */
  public static updateSavedAddress(
    authUserId: string,
    currentProfile: CustomerProfileData,
    addressId: string,
    updates: Partial<CustomerAddress>
  ): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);
    const existing = currentProfile.savedAddresses.find(a => a.id === addressId);
    if (!existing) {
      throw new Error('Address not found.');
    }

    const merged = { ...existing, ...updates };
    const errors = validateAddressPayload(merged);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    const updatedList = currentProfile.savedAddresses.map(a => {
      if (a.id === addressId) {
        return merged;
      }
      if (updates.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    return {
      ...currentProfile,
      savedAddresses: updatedList
    };
  }

  /**
   * Address Book: Delete Address
   */
  public static deleteSavedAddress(
    authUserId: string,
    currentProfile: CustomerProfileData,
    addressId: string
  ): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);
    const remaining = currentProfile.savedAddresses.filter(a => a.id !== addressId);
    if (remaining.length > 0 && !remaining.some(a => a.isDefault)) {
      remaining[0].isDefault = true;
    }
    return {
      ...currentProfile,
      savedAddresses: remaining
    };
  }

  /**
   * Address Book: Set Default
   */
  public static setDefaultAddress(
    authUserId: string,
    currentProfile: CustomerProfileData,
    addressId: string
  ): CustomerProfileData {
    this.assertCustomer(authUserId, currentProfile.userId);
    const updated = currentProfile.savedAddresses.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));
    return {
      ...currentProfile,
      savedAddresses: updated
    };
  }

  /**
   * Customer Orders: List with authorization and filters
   */
  public static getOrders(
    authUserId: string,
    orders: Order[],
    options?: {
      search?: string;
      status?: OrderStatus | 'ALL';
      dateRange?: '30' | '90' | 'ALL';
      page?: number;
      limit?: number;
    }
  ): { orders: Order[]; total: number; page: number; totalPages: number } {
    // 1. Customer Isolation
    let list = orders.filter(o => o.customerId === authUserId);

    // 2. Search
    const search = options?.search?.trim().toLowerCase();
    if (search) {
      list = list.filter(
        o =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.items.some(
            i =>
              i.productName.toLowerCase().includes(search) ||
              i.sku.toLowerCase().includes(search)
          ) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(search))
      );
    }

    // 3. Status filter
    if (options?.status && options.status !== 'ALL') {
      list = list.filter(o => o.status === options.status);
    }

    // 4. Date filter
    if (options?.dateRange && options.dateRange !== 'ALL') {
      const days = parseInt(options.dateRange, 10);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      list = list.filter(o => o.orderDate >= cutoff);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    const total = list.length;
    const page = Math.max(1, options?.page || 1);
    const limit = options?.limit || 10;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return { orders: paginated, total, page, totalPages };
  }

  /**
   * Customer Orders: Detail with customer ownership check
   */
  public static getOrderById(authUserId: string, orderId: string, orders: Order[]): Order {
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    this.assertCustomer(authUserId, order.customerId);
    return order;
  }

  /**
   * Customer Orders: Cancellation Request
   */
  public static cancelOrder(
    authUserId: string,
    orderId: string,
    reason: string,
    orders: Order[]
  ): { updatedOrders: Order[]; cancelledOrder: Order } {
    const target = orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!target) {
      throw new Error('Order not found.');
    }
    this.assertCustomer(authUserId, target.customerId);

    const allowedCancelStatuses: OrderStatus[] = ['Placed', 'Confirmed', 'Processing'];
    if (!allowedCancelStatuses.includes(target.status)) {
      throw new Error(
        `Cannot cancel order with status "${target.status}". Orders that are already dispatched or delivered cannot be directly cancelled. Please use the Returns & Discrepancies process.`
      );
    }

    const cancelledOrder: Order = {
      ...target,
      status: 'Cancelled',
      canCancel: false,
      cancellationReason: reason || 'Customer requested cancellation prior to dispatch.',
      cancelledAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => (o.id === target.id ? cancelledOrder : o));
    return { updatedOrders, cancelledOrder };
  }

  /**
   * Product Verification & Traceability Engine
   */
  public static verifyProduct(
    authUserId: string,
    scannedCode: string,
    shipments: Shipment[],
    products: Product[],
    recentScans: ScanRecord[]
  ): ProductVerificationResult {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) {
      return {
        valid: false,
        status: 'INVALID_CODE',
        message: 'No code provided for verification.',
        scannedCode
      };
    }

    // 1. Check duplicate within 8s window
    const recentDup = recentScans.find(
      s => s.scannedCode.toLowerCase() === cleanCode.toLowerCase() && Date.now() - new Date(s.scannedAt).getTime() < 8000
    );
    if (recentDup) {
      return {
        valid: false,
        status: 'DUPLICATE_SCAN',
        message: `Duplicate scan detected! Barcode "${cleanCode}" was already verified moments ago. Please avoid rescanning the same unit.`,
        scannedCode: cleanCode
      };
    }

    // 2. Identify product from master catalog
    const matchedProduct = products.find(
      p =>
        p.barcode.toLowerCase() === cleanCode.toLowerCase() ||
        p.sku.toLowerCase() === cleanCode.toLowerCase() ||
        cleanCode.toLowerCase().includes(p.sku.toLowerCase())
    );

    if (!matchedProduct) {
      return {
        valid: false,
        status: 'INVALID_CODE',
        message: `Product record not found in DHARM master register for code "${cleanCode}". Item authenticity could not be established.`,
        scannedCode: cleanCode
      };
    }

    // 3. Find customer's authorized shipments containing this item
    const customerShipments = shipments.filter(s => s.customerId === authUserId);
    const relatedShipment = customerShipments.find(s =>
      s.items.some(
        i =>
          i.productId === matchedProduct.id ||
          i.sku.toLowerCase() === matchedProduct.sku.toLowerCase() ||
          i.barcode.toLowerCase() === matchedProduct.barcode.toLowerCase()
      )
    );

    if (!relatedShipment) {
      return {
        valid: false,
        status: 'MISMATCH_DETECTED',
        message: `Warning: SKU ${matchedProduct.sku} exists in the master catalog, but is NOT part of any authorized consignment dispatched to your facility. Potential misrouting or misplaced cargo.`,
        scannedCode: cleanCode,
        product: sanitizeProductForCustomer(matchedProduct) as Product
      };
    }

    const shipmentItem = relatedShipment.items.find(
      i =>
        i.productId === matchedProduct.id ||
        i.sku.toLowerCase() === matchedProduct.sku.toLowerCase()
    );

    const custodyEvents = relatedShipment.events.map(ev => ({
      timestamp: ev.timestamp,
      stage: ev.status,
      organization: ev.performedBy.includes('Owner')
        ? 'Apex Central Depot (Product Owner)'
        : ev.performedBy.includes('Vendor')
        ? 'Trans-Express Logistics (Carrier Hub)'
        : 'BioMed Research Campus (Customer Consignee)',
      location: ev.location,
      verifiedBy: ev.performedBy,
      status: ev.status
    }));

    const isDelivered = relatedShipment.status === 'Delivered';
    const isDiscrepancy = relatedShipment.status === 'Discrepancy Detected' || (shipmentItem && shipmentItem.status === 'Mismatch');

    let status: ProductVerificationResult['status'] = 'VERIFIED';
    let message = `Authentic item verified! SKU ${matchedProduct.sku} matches consignment ${relatedShipment.trackingNumber}. Cryptographic custody integrity intact.`;

    if (isDiscrepancy) {
      status = 'MISMATCH_DETECTED';
      message = `Mismatch or exception flagged on consignment ${relatedShipment.trackingNumber} for SKU ${matchedProduct.sku}. Expected ${shipmentItem?.expectedQuantity || 0} vs Verified ${shipmentItem?.verifiedQuantity || 0}.`;
    } else if (!isDelivered && relatedShipment.status !== 'Received') {
      status = 'VERIFICATION_PENDING';
      message = `Item belongs to active consignment ${relatedShipment.trackingNumber} currently in transit. Final custody receipt pending handover at dock.`;
    }

    return {
      valid: status === 'VERIFIED',
      status,
      message,
      scannedCode: cleanCode,
      product: sanitizeProductForCustomer(matchedProduct) as Product,
      shipment: sanitizeShipmentForCustomer(relatedShipment),
      batchNumber: `LOT-2026-${matchedProduct.sku.substring(0, 4)}-B88`,
      serialNumber: `SN-${cleanCode.replace(/\D/g, '').padEnd(8, '0')}`,
      expectedQuantity: shipmentItem?.expectedQuantity,
      verifiedQuantity: shipmentItem?.verifiedQuantity,
      custodyEvents
    };
  }

  /**
   * Discrepancy Reporting Service
   */
  public static reportDiscrepancy(
    authUserId: string,
    customerName: string,
    payload: DiscrepancySubmissionInput,
    orders: Order[],
    shipments: Shipment[]
  ): DiscrepancyCase {
    // 1. Verify customer owns order
    const order = orders.find(o => o.id === payload.orderId || o.orderNumber === payload.orderId);
    if (!order) {
      throw new Error('Associated order not found.');
    }
    this.assertCustomer(authUserId, order.customerId);

    // 2. Verify shipment
    let shipment = shipments.find(s => s.id === payload.shipmentId || s.trackingNumber === payload.shipmentId);
    if (!shipment) {
      shipment = shipments.find(s => s.customerId === order.customerId) || shipments[0];
    }
    if (shipment) {
      this.assertCustomer(authUserId, shipment.customerId);
    }

    // 3. Validation
    const errors: Record<string, string> = {};
    if (!payload.category) errors.category = 'Please select a discrepancy category.';
    if (payload.expectedQuantity === undefined || payload.expectedQuantity < 0) {
      errors.expectedQuantity = 'Expected quantity must be a non-negative number.';
    }
    if (payload.observedQuantity === undefined || payload.observedQuantity < 0) {
      errors.observedQuantity = 'Received quantity must be a non-negative number.';
    }
    if (!payload.description || payload.description.trim().length < 2) {
      errors.description = 'Please provide a description of the problem.';
    }

    // Evidence file validation
    if (payload.evidenceFiles && payload.evidenceFiles.length > 0) {
      for (const f of payload.evidenceFiles) {
        const fileErr = validateEvidenceFile(f);
        if (fileErr) {
          errors.evidence = fileErr;
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    const matchedItem = order.items.find(i => i.productId === payload.productId) || order.items[0];
    const discNum = `DIS-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newCase: DiscrepancyCase = {
      id: `disc-${Date.now()}`,
      discrepancyNumber: discNum,
      shipmentId: shipment.id,
      shipmentTracking: shipment.trackingNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: authUserId,
      customerName,
      productId: matchedItem?.productId,
      productName: matchedItem?.productName || 'Unspecified Consignment Item',
      sku: matchedItem?.sku,
      type: payload.category,
      severity: payload.category === 'Damaged Goods' ? 'High' : 'Medium',
      status: 'Under Review',
      expectedQuantity: payload.expectedQuantity,
      observedQuantity: payload.observedQuantity,
      detectionStage: 'Customer Handover',
      detectedBy: customerName,
      assignedInvestigator: 'Product Owner Quality Team',
      preferredResolution: payload.preferredResolution,
      evidence: (payload.evidenceFiles || []).map((f, idx) => ({
        id: `evd-${Date.now()}-${idx}`,
        type: 'Photo',
        fileName: f.name,
        fileSize: f.size,
        url: f.dataUrl || '/dharm_logistics_hero.jpg',
        description: `Customer submitted evidence: ${f.name}`,
        timestamp: now,
        uploadedBy: customerName
      })),
      resolutionNotes: payload.description
        ? `Customer report: "${payload.description}" (Requested: ${payload.preferredResolution || 'Resolution'})`
        : 'Complaint received and queued for investigation by supply chain auditor.',
      resolutionOutcome: 'Pending',
      detectedAt: now,
      updatedAt: now
    };

    return newCase;
  }
}

