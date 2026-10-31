export type UserRole = 'OWNER' | 'VENDOR' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  avatar?: string;
  location?: string;
}

export type ShipmentStatus =
  | 'Draft'
  | 'Ready for Dispatch'
  | 'Dispatched'
  | 'In Transit'
  | 'Received'
  | 'Verification Pending'
  | 'Discrepancy Detected'
  | 'Under Investigation'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Cancelled';

export type DiscrepancyType =
  | 'Missing Item'
  | 'Unexpected Product'
  | 'Duplicate Scan'
  | 'Wrong Container'
  | 'Damaged Goods'
  | 'Quantity Mismatch'
  | 'Conflicting Record';

export type DiscrepancyStatus =
  | 'Detected'
  | 'Under Review'
  | 'Evidence Collected'
  | 'Resolution Proposed'
  | 'Resolved'
  | 'Escalated';

export type DiscrepancySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  barcode: string;
  qrCode?: string;
  isSerialized: boolean;
  unit: string;
  billingUnit?: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  gstRate?: number;
  grossPrice?: number;
  currency?: string;
  unitWeight?: number;
  unit_weight?: number;
  status?: 'Active' | 'Inactive' | 'Archived';
  description?: string;
  deliverables?: string;
  createdAt: string;
}

export type ContainerType =
  | 'Cold-Chain Bin'
  | 'Security Crate'
  | 'RFID Pallet'
  | 'Heavy Duty Tote'
  | 'Standard Container'
  | 'Standard Parcel';

export interface ContainerScannedItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  weightKg: number;
  unitWeightKg: number;
  scannedAt: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  type: ContainerType;
  maxCapacity?: number;
  capacityUnit?: 'kg' | 'lbs' | 'units';
  capacityKg: number;
  currentWeightKg: number;
  utilizedCapacity?: number;
  sealNumber: string;
  sealStatus?: 'Active' | 'Compromised' | 'Broken' | 'Verified';
  initialLocation?: string;
  location: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Empty' | 'Assigned' | 'Sealed' | 'In Transit' | 'Unsealed';
  assignedShipmentId?: string;
  assignedShipmentTracking?: string;
  itemCount: number;
  items?: ContainerScannedItem[];
  createdAt?: string;
  createdBy?: string;
  isActive?: boolean;
}

export interface ShipmentItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  containerId: string;
  containerNumber: string;
  expectedQuantity: number;
  verifiedQuantity: number;
  scannedQuantity: number;
  status: 'Pending' | 'Verified' | 'Mismatch' | 'Damaged';
}

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  performedBy: string;
  notes: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  ownerId: string;
  ownerName: string;
  vendorId: string;
  vendorName: string;
  customerId: string;
  customerName: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  containerIds: string[];
  manifestHash: string;
  dispatchDate?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: ShipmentEvent[];
  notes?: string;
  delayReason?: string;
  proofOfDelivery?: {
    receivedBy: string;
    timestamp: string;
    notes?: string;
    signatureVerificationHash?: string;
  };
}

export interface DiscrepancyEvidence {
  id: string;
  type: 'Photo' | 'Scan Log' | 'Manifest Compare' | 'Inspection Report';
  url?: string;
  fileName?: string;
  fileSize?: number;
  description: string;
  timestamp: string;
  uploadedBy: string;
}

export interface DiscrepancyCase {
  id: string;
  discrepancyNumber: string;
  shipmentId: string;
  shipmentTracking: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  containerId?: string;
  containerNumber?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  status: DiscrepancyStatus;
  expectedQuantity: number;
  observedQuantity: number;
  detectionStage: 'Owner Packing' | 'Dispatch Verification' | 'Vendor Receiving' | 'Customer Handover';
  detectedBy: string;
  assignedInvestigator?: string;
  evidence: DiscrepancyEvidence[];
  preferredResolution?: 'Replacement' | 'Return' | 'Refund' | 'Assistance';
  resolutionNotes?: string;
  resolutionOutcome?: 'Approved Replacement' | 'Inventory Adjusted' | 'Found in Other Container' | 'Supplier Credit' | 'Pending';
  detectedAt: string;
  updatedAt: string;
}

export interface ScanRecord {
  id: string;
  scannedCode: string;
  scannedAt: string;
  scannedBy: string;
  role: UserRole;
  shipmentId?: string;
  containerId?: string;
  type: 'Product' | 'Container' | 'Seal' | 'Unknown';
  result: 'Expected Match' | 'Duplicate Attempt' | 'Unexpected Product' | 'Wrong Container' | 'Damaged Reported';
  notes?: string;
}

export type CustomerResolutionChoice = 'Replace Product' | 'Refund Amount';

export interface ReturnCase {
  id: string;
  returnNumber: string;
  originalShipmentId: string;
  trackingNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  reason: 'Damaged in Transit' | 'Incorrect Item Received' | 'Defective Unit' | 'Customer Cancellation';
  productCondition?: 'Unopened Original Packaging' | 'Damaged Exterior Seal' | 'Defective Internals' | 'Broken Seal';
  status: 'Requested' | 'Pickup Scheduled' | 'Received at Hub' | 'Inspected' | 'Quarantined' | 'Replacement Dispatched' | 'Refund Processed' | 'Closed';
  evidencePhotos: string[];
  inspectionNotes?: string;
  quarantineLocation?: string;
  replacementShipmentId?: string;
  resolutionDate?: string;
  customerChoice?: CustomerResolutionChoice;
  refundAmount?: number;
  refundStatus?: 'Pending' | 'Processed' | 'Pending Inspection' | 'Processed to Account' | 'Not Applicable';
  refundReference?: string;
  vendorVerified?: boolean;
  vendorVerifiedBy?: string;
  vendorVerifiedAt?: string;
  problemDiagnosis?: string;
  requestedAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'Shipment' | 'Product' | 'Container' | 'Discrepancy' | 'Scan' | 'Return';
  entityId: string;
  details: string;
  ipAddress?: string;
}

// -------------------------------------------------------------
// Customer Portal Domain Types
// -------------------------------------------------------------

export type CustomerType = 'individual' | 'business';

export interface CustomerAddress {
  id: string;
  label: string;
  contactName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
  deliveryInstructions?: string;
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface CustomerProfileData {
  customerId: string;
  userId: string;
  customerType: CustomerType;
  name: string;
  companyName?: string;
  email: string;
  mobile: string;
  gstin?: string;
  accountStatus: 'Active' | 'Pending Verification' | 'Suspended';
  createdAt: string;
  billingAddress: BillingAddress;
  savedAddresses: CustomerAddress[];
}

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus =
  | 'Paid'
  | 'Pending'
  | 'Invoice Pending'
  | 'Refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  expectedDeliveryDate: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingAddress: CustomerAddress;
  billingAddress: BillingAddress;
  customerPoNumber?: string;
  logisticsProvider?: string;
  shipmentId?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  invoiceAvailable: boolean;
  canCancel: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
}

export type NotificationCategory =
  | 'ORDER'
  | 'SHIPMENT'
  | 'VERIFICATION'
  | 'DISCREPANCY'
  | 'RETURN';

export interface CustomerNotification {
  id: string;
  customerId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string;
  read: boolean;
  link?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

export interface ProductVerificationResult {
  valid: boolean;
  status: 'VERIFIED' | 'MISMATCH_DETECTED' | 'VERIFICATION_PENDING' | 'DUPLICATE_SCAN' | 'INVALID_CODE';
  message: string;
  scannedCode: string;
  product?: Product;
  shipment?: Shipment;
  order?: Order;
  batchNumber?: string;
  serialNumber?: string;
  expectedQuantity?: number;
  verifiedQuantity?: number;
  custodyEvents?: Array<{
    timestamp: string;
    stage: string;
    organization: string;
    location: string;
    verifiedBy: string;
    status: string;
  }>;
}
