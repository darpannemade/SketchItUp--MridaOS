export type BusinessType = 'hybrid' | 'fertilizer' | 'nursery';

export type UserRole =
  | 'owner'
  | 'counter_staff'
  | 'inventory_manager'
  | 'procurement_user'
  | 'nursery_care_staff'
  | 'accounts_user'
  | 'admin'
  | 'delivery_staff'
  | 'field_sales';

export type UserStatus = 'active' | 'revoked';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId?: string | null;
  status: UserStatus;
  createdAt: string;
  lastSignInAt?: string | null;
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  isRevoked: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  type: BusinessType;
  manager: string;
  licenseNumber: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  change?: string;
  isPositive?: boolean;
  tag?: string;
  tagType?: 'good' | 'warning' | 'critical' | 'neutral';
  description: string;
  isHero?: boolean;
}

export interface OperationalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  category: 'inventory' | 'khata' | 'compliance' | 'nursery' | 'procurement' | 'tally';
  countOrValue?: string;
  timestamp: string;
  actionLabel: string;
  actionType: 'review_expiry' | 'create_po' | 'view_khata' | 'renew_license' | 'view_tasks' | 'stock_audit' | 'view_tally';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Fertilizer' | 'Bio-Fertilizer' | 'Pesticide' | 'Seeds' | 'Plant/Sapling' | 'Pot & Soil' | 'Tools';
  sku: string;
  stockQty: number;
  unit: string;
  reorderLevel: number;
  suggestedReorderQty: number;
  unitPrice: number;
  costPrice: number;
  rackLocation: string;
  velocity: 'fast' | 'moderate' | 'slow' | 'dead';
  daysWithoutMovement?: number;
  supplierName: string;
  batches: Batch[];
  // PRD Fertilizer Trading Extensions
  isSubsidised?: boolean;
  notifiedMrp?: number;
  isShelfLifeSensitive?: boolean;
  godownId?: string;
  hsnCode?: string;
  gstRate?: number;
  tallyStockItemName?: string;
}

export interface Batch {
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  rack: string;
  status: 'healthy' | 'expiring_soon' | 'critical_expiry' | 'expired';
  godownId?: string;
}

export interface CustomerKhata {
  id: string;
  name: string;
  phone: string;
  village: string;
  totalPurchased: number;
  outstandingBalance: number;
  creditLimit: number;
  creditPeriodDays?: number;
  daysOverdue: number;
  lastPaymentDate: string;
  status: 'healthy' | 'due_soon' | 'overdue' | 'blocked';
  ageing: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  // PRD Section 6.5 & 6.8 Extensions
  customerType?: 'walk_in' | 'credit_farmer' | 'sub_dealer';
  aadhaarMasked?: string;
  kccNumber?: string;
  landholdingAcres?: number;
  monthlySubsidisedBagsPurchased?: number;
  monthlySubsidyCapBags?: number;
  gstin?: string;
  tallyLedgerName?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  itemsCount: number;
  totalAmount: number;
  orderDate: string;
  expectedDelivery: string;
  status: 'draft' | 'pending_owner_approval' | 'pending_acknowledgement' | 'dispatched' | 'grn_pending' | 'partial_received' | 'received';
  paymentTerms: string;
  notes?: string;
  requiresOwnerApproval?: boolean;
  approvedByOwner?: boolean;
  grnRecords?: GRNRecord[];
  lineItems?: {
    itemId?: string;
    name: string;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
  }[];
}

export interface GRNRecord {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierName: string;
  receivedDate: string;
  godownId: string;
  godownName: string;
  supplierInvoiceNo: string;
  gstInputTax: number;
  totalInvoiceAmount: number;
  varianceFlagged: boolean;
  varianceNotes?: string;
  items: {
    itemName: string;
    orderedQty: number;
    receivedQty: number;
    rejectedQty: number;
    batchNumber: string;
    manufacturingDate: string;
    expiryDate: string;
    unitCost: number;
  }[];
}

export interface SupplierMaster {
  id: string;
  firmName: string;
  gstin: string;
  fcoLicenseNo: string;
  fcoLicenseExpiry: string;
  address: string;
  contactPerson: string;
  phone: string;
  bankDetails: string;
  categoriesSupplied: string[];
  creditPeriodDays: number;
  creditLimit: number;
  outstandingPayable: number;
  onTimeDeliveryPct: number;
  rejectionPct: number;
  fillRatePct: number;
  tallyLedgerName: string;
  priceList: {
    productName: string;
    sku: string;
    purchaseRate: number;
    notifiedMrp: number;
    schemeDiscountPct: number;
    effectiveDate: string;
  }[];
}

export interface GodownMaster {
  id: string;
  name: string;
  code: string;
  branchId: string;
  location: string;
  managerName: string;
  capacityBags: number;
  occupiedBags: number;
  stockValue: number;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromGodownId: string;
  fromGodownName: string;
  toGodownId: string;
  toGodownName: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  initiatedDate: string;
  status: 'in_transit' | 'received';
  vehicleNo?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string;
  invoiceNo: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  destinationVillage: string;
  itemsSummary: string;
  totalBagsOrUnits: number;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  scheduledDate: string;
  status: 'pending' | 'dispatched' | 'delivered' | 'discrepancy';
  podType?: 'otp' | 'signature' | 'photo';
  podReference?: string;
  podTimestamp?: string;
  discrepancyNote?: string;
}

export interface TallySyncVoucher {
  id: string;
  voucherNo: string;
  voucherType: 'Sales' | 'Purchase' | 'Receipt' | 'Payment';
  date: string;
  partyLedgerName: string;
  amount: number;
  gstAmount: number;
  narration: string;
  status: 'synced' | 'pending' | 'failed';
  lastSyncAttempt: string;
  errorMessage?: string;
  xmlPayloadPreview: string;
  referenceId: string;
}

export interface SchemeRule {
  id: string;
  schemeName: string;
  code: string;
  applicableCategory: string;
  minQty: number;
  discountPct: number;
  validUntil: string;
  isActive: boolean;
  description: string;
}

export interface PosSubsidyRecord {
  id: string;
  posTxnId: string;
  invoiceNo: string;
  date: string;
  buyerName: string;
  authMode: 'Aadhaar Biometric' | 'Aadhaar OTP' | 'Kisan Credit Card (KCC)' | 'Voter ID';
  aadhaarHash: string;
  productName: string;
  bagsCount: number;
  notifiedMrpTotal: number;
  govtSubsidyClaimed: number;
  reconciledWithIfms: boolean;
}

export interface PlantCareTask {
  id: string;
  title: string;
  category: 'Watering' | 'Fertilizing' | 'Pest Inspection' | 'Pruning' | 'Repotting';
  section: string;
  timeSlot: string;
  plantType: string;
  quantity: string;
  isCompleted: boolean;
  notes?: string;
}

export interface NurserySensor {
  id: string;
  name: string;
  model: string;
  type: 'moisture' | 'temperature' | 'humidity' | 'ph' | 'co2';
  value: string;
  unit: string;
  status: 'optimal' | 'warning' | 'alert';
  location: string;
  lastSync: string;
  note: string;
}

export interface ComplianceLicense {
  id: string;
  name: string;
  authority: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'valid' | 'renewal_due' | 'critical' | 'expired';
  requiredDocuments: string[];
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  user: string;
  time: string;
  tag: 'sale' | 'khata' | 'procurement' | 'inventory' | 'nursery' | 'compliance' | 'tally' | 'delivery';
  referenceId?: string;
}

export interface SaleItem {
  itemId?: string;
  name: string;
  qty: number;
  price: number;
  batch: string;
  isSubsidised?: boolean;
  notifiedMrp?: number;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone?: string;
  isKhata: boolean;
  items: SaleItem[];
  total: number;
  cashPaid: number;
  khataAmount: number;
  date: string;
  timestamp: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'khata' | 'split';
  // PRD PoS/DBT & Delivery & Tally Extensions
  hasSubsidisedItems?: boolean;
  posTransactionId?: string;
  buyerAuthMode?: 'Aadhaar Biometric' | 'Aadhaar OTP' | 'KCC' | 'Voter ID';
  buyerIdMasked?: string;
  requiresDelivery?: boolean;
  challanNo?: string;
  schemeDiscountApplied?: number;
  tallyVoucherStatus?: 'synced' | 'pending' | 'failed';
}

export interface SeasonalInsight {
  id?: string;
  seasonName: string;
  currentPhase: string;
  weatherCondition: string;
  highDemandProducts: {
    name: string;
    expectedSurge: string;
    stockStatus: 'adequate' | 'needs_procurement' | 'critical';
    category: string;
  }[];
  strategicAdvice: string;
}

export interface MortalityRecord {
  id: string;
  date: string;
  plantName: string;
  quantityLost: number;
  estimatedValue: number;
  reason: 'Pest Infestation' | 'Over-watering' | 'Extreme Heat' | 'Fungal Blight' | 'Root Rot' | 'Transit Damage' | string;
  section: string;
}

export interface NurseryCamera {
  id: string;
  title: string;
  url: string;
  status: string;
  sensorsInfo?: string;
}
