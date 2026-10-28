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
  isSerialized: boolean;
  unit: string;
  billingUnit?: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  gstRate?: number;
  grossPrice?: number;
  currency?: string;
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
  maxCapacity: number;
  capacityUnit: 'kg' | 'lbs' | 'units';
  capacityKg: number;
  currentWeightKg: number;
  utilizedCapacity?: number;
  sealNumber: string;
  sealStatus?: 'Active' | 'Compromised' | 'Broken' | 'Verified';
  initialLocation: string;
  location: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Empty' | 'Assigned' | 'Sealed' | 'In Transit' | 'Unsealed';
  assignedShipmentId?: string;
  assignedShipmentTracking?: string;
  itemCount: number;
  items?: ContainerScannedItem[];
  createdAt: string;
  createdBy: string;
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
}

export interface DiscrepancyEvidence {
  id: string;
  type: 'Photo' | 'Scan Log' | 'Manifest Compare' | 'Inspection Report';
  url?: string;
  description: string;
  timestamp: string;
  uploadedBy: string;
}

export interface DiscrepancyCase {
  id: string;
  discrepancyNumber: string;
  shipmentId: string;
  shipmentTracking: string;
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

export interface ReturnCase {
  id: string;
  returnNumber: string;
  originalShipmentId: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: 'Damaged in Transit' | 'Incorrect Item Received' | 'Defective Unit' | 'Customer Cancellation';
  status: 'Requested' | 'Pickup Scheduled' | 'Received at Hub' | 'Inspected' | 'Quarantined' | 'Replacement Dispatched' | 'Closed';
  evidencePhotos: string[];
  inspectionNotes?: string;
  quarantineLocation?: string;
  replacementShipmentId?: string;
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
