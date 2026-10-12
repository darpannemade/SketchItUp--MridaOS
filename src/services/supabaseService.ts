import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import {
  Branch,
  InventoryItem,
  SaleRecord,
  CustomerKhata,
  PurchaseOrder,
  PlantCareTask,
  NurserySensor,
  ComplianceLicense,
  ActivityLog,
  SeasonalInsight,
  NurseryCamera,
  OperationalAlert,
  MortalityRecord,
  UserProfile,
  UserRole,
  BusinessType,
  SupplierMaster,
  GodownMaster,
  StockTransfer,
  DeliveryChallan,
  TallySyncVoucher,
  SchemeRule,
  PosSubsidyRecord,
  GRNRecord,
} from '../types';

// ==============================================================================
// 0. User Profiles & Admin Management
// ==============================================================================
export const DEFAULT_GENUINE_USERS: UserProfile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@mridaos.in',
    fullName: 'System Administrator',
    role: 'admin',
    branchId: undefined,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'owner@mridaos.in',
    fullName: 'Rajeshwar Deshmukh (Owner)',
    role: 'owner',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'counter@mridaos.in',
    fullName: 'Amol Kulkarni (Counter POS)',
    role: 'counter_staff',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'inventory@mridaos.in',
    fullName: 'Sandeep Jadhav (Godown Mgr)',
    role: 'inventory_manager',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'procurement@mridaos.in',
    fullName: 'Vikram Pawar (Purchase Mgr)',
    role: 'procurement_user',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    email: 'accounts@mridaos.in',
    fullName: 'Prashant Joshi (Tally Accountant)',
    role: 'accounts_user',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    email: 'nurserycare@mridaos.in',
    fullName: 'Sunita More (Nursery Care)',
    role: 'nursery_care_staff',
    branchId: 'nashik-central',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastSignInAt: new Date().toISOString(),
  },
];

function getStoredCustomUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_users');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_users', JSON.stringify(DEFAULT_GENUINE_USERS));
    return [...DEFAULT_GENUINE_USERS];
  } catch {
    return [...DEFAULT_GENUINE_USERS];
  }
}

function saveStoredCustomUsers(users: UserProfile[]) {
  try {
    localStorage.setItem('mridaos_custom_users', JSON.stringify(users));
  } catch (err) {
    console.warn('Could not persist custom users to localStorage:', err);
  }
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data } = await supabase
      .from('user_accounts')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userId}`)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        branchId: data.branch_id,
        status: data.is_active === false ? 'revoked' : 'active',
        createdAt: data.created_at,
        lastSignInAt: data.last_login_at,
      };
    }
  } catch {}

  const all = await fetchAllUsers();
  return all.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) || null;
};

export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  let dbUsers: UserProfile[] = [];
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      dbUsers = data.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role as UserRole,
        branchId: row.branch_id || 'nashik-central',
        status: row.is_active === false ? 'revoked' : 'active',
        createdAt: row.created_at,
        lastSignInAt: row.last_login_at,
      }));
    }
  } catch {}

  const storedUsers = getStoredCustomUsers();
  const emailMap = new Map<string, UserProfile>();

  DEFAULT_GENUINE_USERS.forEach((u) => emailMap.set(u.email.toLowerCase(), u));
  storedUsers.forEach((u) => emailMap.set(u.email.toLowerCase(), u));
  dbUsers.forEach((u) => emailMap.set(u.email.toLowerCase(), u));

  return Array.from(emailMap.values());
};

export const adminCreateUser = async (
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  branchId: string = 'nashik-central'
): Promise<{ success: boolean; error?: string }> => {
  const normEmail = email.trim().toLowerCase();
  const newUser: UserProfile = {
    id: crypto.randomUUID(),
    email: normEmail,
    fullName: fullName.trim(),
    role,
    branchId: branchId || 'nashik-central',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastSignInAt: null,
  };

  const customUsers = getStoredCustomUsers().filter((u) => u.email.toLowerCase() !== normEmail);
  customUsers.push(newUser);
  saveStoredCustomUsers(customUsers);

  try {
    const passwords = JSON.parse(localStorage.getItem('mridaos_custom_passwords') || '{}');
    passwords[normEmail] = password;
    localStorage.setItem('mridaos_custom_passwords', JSON.stringify(passwords));
  } catch {}

  try {
    await supabase.from('user_accounts').upsert({
      id: newUser.id,
      email: normEmail,
      password_hash: '$2a$10$fFakeHashForLocalDevSync1234567890abcdefghijklmnopqrstuv',
      full_name: fullName.trim(),
      role,
      branch_id: branchId || 'nashik-central',
      is_active: true,
      created_at: newUser.createdAt,
      updated_at: newUser.createdAt,
    });
  } catch (err) {
    console.warn('Realtime user insertion synced locally:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminUpdateUser = async (
  userId: string,
  fullName: string,
  role: UserRole,
  branchId?: string
): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  const trimmedName = fullName.trim();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return {
        ...u,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : u.branchId,
      };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({
        ...defaultMatch,
        fullName: trimmedName,
        role,
        branchId: branchId !== undefined ? branchId : defaultMatch.branchId,
      });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  try {
    await supabase
      .from('user_accounts')
      .update({
        full_name: trimmedName,
        role,
        branch_id: branchId || 'nashik-central',
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch (err) {
    console.warn('Realtime Supabase user update:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminRevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return { ...u, status: 'revoked' as const };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({ ...defaultMatch, status: 'revoked' as const });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  try {
    await supabase
      .from('user_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminUnrevokeUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers();
  let found = false;

  const updatedUsers = allUsers.map((u) => {
    if (u.id === userId || u.email.toLowerCase() === userId.toLowerCase()) {
      found = true;
      return { ...u, status: 'active' as const };
    }
    return u;
  });

  if (!found) {
    const defaultMatch = DEFAULT_GENUINE_USERS.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (defaultMatch) {
      updatedUsers.push({ ...defaultMatch, status: 'active' as const });
    }
  }

  saveStoredCustomUsers(updatedUsers);

  try {
    await supabase
      .from('user_accounts')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

export const adminDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const allUsers = getStoredCustomUsers().filter(
    (u) => u.id !== userId && u.email.toLowerCase() !== userId.toLowerCase()
  );
  saveStoredCustomUsers(allUsers);

  try {
    await supabase.from('user_accounts').delete().or(`id.eq.${userId},email.eq.${userId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mridaos_users_changed'));
  }

  return { success: true };
};

// ==============================================================================
// 1. Branches API
// ==============================================================================
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'nashik-central',
    name: 'Nashik Central Agro-Hub (APMC)',
    location: 'Plot 42, New APMC Market Yard, Panchavati, Nashik, MH 422003',
    type: 'hybrid',
    manager: 'Rajeshwar Deshmukh',
    licenseNumber: 'MH-NSK-FERT-2023-8821',
  },
  {
    id: 'pimpalgaon-branch',
    name: 'Pimpalgaon Baswant Retail Outlet',
    location: 'Gate 2, Onion & Grape Mandi Road, Pimpalgaon, Nashik, MH 422209',
    type: 'fertilizer',
    manager: 'Sandeep Jadhav',
    licenseNumber: 'MH-NSK-FERT-2024-1104',
  },
  {
    id: 'dindori-nursery',
    name: 'Dindori Hi-Tech Polyhouse & Godown',
    location: 'Vani-Dindori State Highway, Taluka Dindori, Nashik, MH 422202',
    type: 'nursery',
    manager: 'Sunita More',
    licenseNumber: 'NHB-NUR-MH-2024-0031',
  },
];

export const fetchBranches = async (): Promise<Branch[]> => {
  try {
    const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        location: row.location,
        type: (row.type as BusinessType) || 'hybrid',
        manager: row.manager || '',
        licenseNumber: row.license_number || '',
      }));
    }
  } catch {}

  return DEFAULT_BRANCHES;
};

export const insertBranch = async (branch: Branch): Promise<void> => {
  try {
    await supabase.from('branches').upsert({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      type: branch.type,
      manager: branch.manager,
      license_number: branch.licenseNumber,
    });
  } catch (err) {
    console.warn('Branch upsert fallback:', err);
  }
};

// ==============================================================================
// 2. Inventory API (With FEFO Batches, Subsidised Flag, Notified MRP & Godowns)
// ==============================================================================
export const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-001',
    name: 'Neem Coated Urea (46% N) - 45kg Bag',
    category: 'Fertilizer',
    sku: 'IFFCO-NCU-45',
    stockQty: 340,
    unit: 'Bags',
    reorderLevel: 100,
    suggestedReorderQty: 250,
    unitPrice: 266.5,
    notifiedMrp: 266.5,
    costPrice: 242,
    rackLocation: 'Godown A • Bay 01',
    godownId: 'godown-apmc-1',
    velocity: 'fast',
    daysWithoutMovement: 0,
    supplierName: 'IFFCO Maharashtra State Marketing',
    isSubsidised: true,
    isShelfLifeSensitive: false,
    hsnCode: '31021000',
    gstRate: 5,
    tallyStockItemName: 'IFFCO Neem Coated Urea 45kg',
    batches: [
      {
        batchNumber: 'NCU-2026-01',
        manufacturingDate: '2026-05-10',
        expiryDate: '2028-05-09',
        daysRemaining: 577,
        quantity: 200,
        rack: 'Bay 01-A',
        status: 'healthy',
        godownId: 'godown-apmc-1',
      },
      {
        batchNumber: 'NCU-2026-04',
        manufacturingDate: '2026-08-01',
        expiryDate: '2028-07-31',
        daysRemaining: 660,
        quantity: 140,
        rack: 'Bay 01-B',
        status: 'healthy',
        godownId: 'godown-apmc-1',
      },
    ],
  },
  {
    id: 'inv-002',
    name: 'DAP 18:46:00 (Di-Ammonium Phosphate) 50kg',
    category: 'Fertilizer',
    sku: 'CORO-DAP-50',
    stockQty: 65,
    unit: 'Bags',
    reorderLevel: 80,
    suggestedReorderQty: 150,
    unitPrice: 1350,
    notifiedMrp: 1350,
    costPrice: 1280,
    rackLocation: 'Godown A • Bay 02',
    godownId: 'godown-apmc-1',
    velocity: 'fast',
    daysWithoutMovement: 1,
    supplierName: 'Coromandel International Ltd',
    isSubsidised: true,
    isShelfLifeSensitive: false,
    hsnCode: '31053000',
    gstRate: 5,
    tallyStockItemName: 'Gromor DAP 18-46-00 50kg',
    batches: [
      {
        batchNumber: 'DAP-2026-09',
        manufacturingDate: '2026-04-15',
        expiryDate: '2028-04-14',
        daysRemaining: 552,
        quantity: 65,
        rack: 'Bay 02-A',
        status: 'healthy',
        godownId: 'godown-apmc-1',
      },
    ],
  },
  {
    id: 'inv-003',
    name: 'MOP - Muriate of Potash (60% K2O) 50kg',
    category: 'Fertilizer',
    sku: 'IPL-MOP-50',
    stockQty: 42,
    unit: 'Bags',
    reorderLevel: 50,
    suggestedReorderQty: 100,
    unitPrice: 1655,
    notifiedMrp: 1655,
    costPrice: 1560,
    rackLocation: 'Godown A • Bay 03',
    godownId: 'godown-apmc-1',
    velocity: 'moderate',
    daysWithoutMovement: 3,
    supplierName: 'Indian Potash Limited (IPL)',
    isSubsidised: true,
    isShelfLifeSensitive: false,
    hsnCode: '31042000',
    gstRate: 5,
    tallyStockItemName: 'IPL MOP 50kg',
    batches: [
      {
        batchNumber: 'MOP-2025-44',
        manufacturingDate: '2025-11-20',
        expiryDate: '2027-11-19',
        daysRemaining: 405,
        quantity: 42,
        rack: 'Bay 03-A',
        status: 'healthy',
        godownId: 'godown-apmc-1',
      },
    ],
  },
  {
    id: 'inv-004',
    name: 'NPK 19:19:19 Water Soluble Foliar (1kg)',
    category: 'Fertilizer',
    sku: 'MAHA-NPK19-1KG',
    stockQty: 185,
    unit: 'Packets',
    reorderLevel: 60,
    suggestedReorderQty: 120,
    unitPrice: 180,
    costPrice: 138,
    rackLocation: 'Godown B • Rack F2',
    godownId: 'godown-pimpalgaon-2',
    velocity: 'fast',
    daysWithoutMovement: 0,
    supplierName: 'Mahadhan AgriTech (Smartchem)',
    isSubsidised: false,
    isShelfLifeSensitive: true,
    hsnCode: '31052000',
    gstRate: 18,
    tallyStockItemName: 'Mahadhan NPK 19:19:19 1kg',
    batches: [
      {
        batchNumber: 'NPK-2026-11',
        manufacturingDate: '2025-10-25',
        expiryDate: '2026-10-28',
        daysRemaining: 18,
        quantity: 45,
        rack: 'Rack F2-Top',
        status: 'critical_expiry',
        godownId: 'godown-pimpalgaon-2',
      },
      {
        batchNumber: 'NPK-2026-48',
        manufacturingDate: '2026-06-10',
        expiryDate: '2028-06-09',
        daysRemaining: 608,
        quantity: 140,
        rack: 'Rack F2-Mid',
        status: 'healthy',
        godownId: 'godown-pimpalgaon-2',
      },
    ],
  },
  {
    id: 'inv-005',
    name: 'Chlorpyrifos 20% EC Insecticide (1 Litre)',
    category: 'Pesticide',
    sku: 'BAY-CHL-1L',
    stockQty: 28,
    unit: 'Bottles',
    reorderLevel: 40,
    suggestedReorderQty: 80,
    unitPrice: 450,
    costPrice: 365,
    rackLocation: 'Pesticide Vault • Cage 01',
    godownId: 'godown-apmc-1',
    velocity: 'fast',
    daysWithoutMovement: 2,
    supplierName: 'Bayer CropScience India',
    isSubsidised: false,
    isShelfLifeSensitive: true,
    hsnCode: '38089199',
    gstRate: 18,
    tallyStockItemName: 'Chlorpyrifos 20% EC 1L',
    batches: [
      {
        batchNumber: 'CHP-2025-08',
        manufacturingDate: '2024-11-01',
        expiryDate: '2026-10-31',
        daysRemaining: 21,
        quantity: 18,
        rack: 'Cage 01-S1',
        status: 'critical_expiry',
        godownId: 'godown-apmc-1',
      },
      {
        batchNumber: 'CHP-2025-01-EXP',
        manufacturingDate: '2024-09-10',
        expiryDate: '2026-09-09',
        daysRemaining: -31,
        quantity: 10,
        rack: 'Quarantine Rack Q1',
        status: 'expired',
        godownId: 'godown-apmc-1',
      },
    ],
  },
  {
    id: 'inv-006',
    name: 'Azotobacter + PSB Liquid Bio-Consortium (1L)',
    category: 'Bio-Fertilizer',
    sku: 'BIO-AZO-1L',
    stockQty: 54,
    unit: 'Bottles',
    reorderLevel: 30,
    suggestedReorderQty: 60,
    unitPrice: 320,
    costPrice: 230,
    rackLocation: 'Cool Room • Shelf C3',
    godownId: 'godown-apmc-1',
    velocity: 'moderate',
    daysWithoutMovement: 5,
    supplierName: 'IFFCO Maharashtra State Marketing',
    isSubsidised: false,
    isShelfLifeSensitive: true,
    hsnCode: '31010099',
    gstRate: 5,
    tallyStockItemName: 'IFFCO Liquid Bio Consortium 1L',
    batches: [
      {
        batchNumber: 'BIO-2026-19',
        manufacturingDate: '2026-05-20',
        expiryDate: '2026-11-18',
        daysRemaining: 39,
        quantity: 54,
        rack: 'Shelf C3',
        status: 'expiring_soon',
        godownId: 'godown-apmc-1',
      },
    ],
  },
  {
    id: 'inv-007',
    name: 'Panchganga Super Red Onion Seed (Rabi 500g)',
    category: 'Seeds',
    sku: 'SEED-ONION-500G',
    stockQty: 95,
    unit: 'Pouch',
    reorderLevel: 50,
    suggestedReorderQty: 100,
    unitPrice: 1150,
    costPrice: 920,
    rackLocation: 'Seed Vault • Bin S4',
    godownId: 'godown-pimpalgaon-2',
    velocity: 'fast',
    daysWithoutMovement: 0,
    supplierName: 'Panchganga Seeds Pvt Ltd',
    isSubsidised: false,
    isShelfLifeSensitive: true,
    hsnCode: '12099130',
    gstRate: 0,
    tallyStockItemName: 'Panchganga Rabi Onion Seed 500g',
    batches: [
      {
        batchNumber: 'ONN-2026-R1',
        manufacturingDate: '2026-06-01',
        expiryDate: '2027-03-31',
        daysRemaining: 172,
        quantity: 95,
        rack: 'Bin S4',
        status: 'healthy',
        godownId: 'godown-pimpalgaon-2',
      },
    ],
  },
  {
    id: 'inv-008',
    name: 'Bhagwa Pomegranate Tissue Culture Sapling',
    category: 'Plant/Sapling',
    sku: 'NUR-POM-BHAGWA',
    stockQty: 420,
    unit: 'Saplings',
    reorderLevel: 150,
    suggestedReorderQty: 300,
    unitPrice: 65,
    costPrice: 38,
    rackLocation: 'Polyhouse Tunnel 1',
    godownId: 'godown-dindori-3',
    velocity: 'fast',
    daysWithoutMovement: 1,
    supplierName: 'Sahyadri Horticulture Nursery',
    isSubsidised: false,
    isShelfLifeSensitive: true,
    hsnCode: '06022090',
    gstRate: 0,
    tallyStockItemName: 'Bhagwa Pomegranate Sapling',
    batches: [
      {
        batchNumber: 'POM-LOT-88',
        manufacturingDate: '2026-08-10',
        expiryDate: '2026-11-05',
        daysRemaining: 26,
        quantity: 420,
        rack: 'Tunnel 1 • Bed B',
        status: 'critical_expiry',
        godownId: 'godown-dindori-3',
      },
    ],
  },
];

function getStoredInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_inventory');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_inventory', JSON.stringify(DEFAULT_INVENTORY));
    return [...DEFAULT_INVENTORY];
  } catch {
    return [...DEFAULT_INVENTORY];
  }
}

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        sku: row.sku,
        stockQty: Number(row.stock_qty) || 0,
        unit: row.unit,
        reorderLevel: Number(row.reorder_level) || 0,
        suggestedReorderQty: Number(row.suggested_reorder_qty) || 0,
        unitPrice: Number(row.unit_price) || 0,
        notifiedMrp: row.notified_mrp ? Number(row.notified_mrp) : undefined,
        costPrice: Number(row.cost_price) || 0,
        rackLocation: row.rack_location || '',
        velocity: row.velocity || 'moderate',
        daysWithoutMovement: row.days_without_movement || 0,
        supplierName: row.supplier_name || '',
        isSubsidised: Boolean(row.is_subsidised),
        isShelfLifeSensitive: Boolean(row.is_shelf_life_sensitive),
        batches: Array.isArray(row.batches) ? row.batches : [],
      }));
    }
  } catch {}

  return getStoredInventory();
};

export const insertInventoryItem = async (item: InventoryItem): Promise<void> => {
  try {
    const current = getStoredInventory().filter((i) => i.id !== item.id);
    current.unshift(item);
    localStorage.setItem('mridaos_custom_inventory', JSON.stringify(current));
  } catch {}

  try {
    await supabase.from('inventory').insert({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku,
      stock_qty: item.stockQty,
      unit: item.unit,
      reorder_level: item.reorderLevel,
      suggested_reorder_qty: item.suggestedReorderQty,
      unit_price: item.unitPrice,
      cost_price: item.costPrice,
      rack_location: item.rackLocation,
      velocity: item.velocity,
      days_without_movement: item.daysWithoutMovement,
      supplier_name: item.supplierName,
      batches: item.batches,
    });
  } catch (err) {
    console.warn('Inventory insert fallback:', err);
  }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
  try {
    const current = getStoredInventory().map((item) => (item.id === id ? { ...item, ...updates } : item));
    localStorage.setItem('mridaos_custom_inventory', JSON.stringify(current));
  } catch {}

  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.stockQty !== undefined) dbUpdates.stock_qty = updates.stockQty;
    if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
    if (updates.rackLocation !== undefined) dbUpdates.rack_location = updates.rackLocation;
    if (updates.batches !== undefined) dbUpdates.batches = updates.batches;

    await supabase.from('inventory').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Inventory update fallback:', err);
  }
};

// ==============================================================================
// 3. Sales & GST Tax Invoices API
// ==============================================================================
export const DEFAULT_SALES: SaleRecord[] = [
  {
    id: 'sale-001',
    invoiceNo: 'INV/2026/00101',
    customerName: 'Dnyaneshwar Gaikwad',
    customerPhone: '+91 98220 11234',
    isKhata: false,
    items: [
      { name: 'Neem Coated Urea (46% N) - 45kg Bag', qty: 4, price: 266.5, batch: 'NCU-2026-01', isSubsidised: true, notifiedMrp: 266.5 },
      { name: 'DAP 18:46:00 (Di-Ammonium Phosphate) 50kg', qty: 2, price: 1350, batch: 'DAP-2026-09', isSubsidised: true, notifiedMrp: 1350 },
    ],
    total: 3766,
    cashPaid: 3766,
    khataAmount: 0,
    date: new Date().toISOString().split('T')[0],
    timestamp: '10:45 AM',
    paymentMode: 'upi',
    hasSubsidisedItems: true,
    posTransactionId: 'IFMS-MH-2026-884120',
    buyerAuthMode: 'Aadhaar Biometric',
    buyerIdMasked: 'XXXX-XXXX-4821',
    tallyVoucherStatus: 'synced',
  },
  {
    id: 'sale-002',
    invoiceNo: 'INV/2026/00102',
    customerName: 'Kisan Agro Syndicate (Sub-Dealer)',
    customerPhone: '+91 98221 44556',
    isKhata: true,
    items: [
      { name: 'MOP - Muriate of Potash (60% K2O) 50kg', qty: 10, price: 1655, batch: 'MOP-2025-44', isSubsidised: true, notifiedMrp: 1655 },
      { name: 'Chlorpyrifos 20% EC Insecticide (1 Litre)', qty: 5, price: 450, batch: 'CHP-2025-08' },
    ],
    total: 18800,
    cashPaid: 5000,
    khataAmount: 13800,
    date: new Date().toISOString().split('T')[0],
    timestamp: '11:15 AM',
    paymentMode: 'split',
    hasSubsidisedItems: true,
    posTransactionId: 'IFMS-MH-2026-884195',
    buyerAuthMode: 'Aadhaar Biometric',
    buyerIdMasked: 'XXXX-XXXX-9910',
    requiresDelivery: true,
    challanNo: 'DC-2026-041',
    tallyVoucherStatus: 'synced',
  },
  {
    id: 'sale-003',
    invoiceNo: 'INV/2026/00103',
    customerName: 'GreenValley Orchards (B2B)',
    customerPhone: '+91 98230 77889',
    isKhata: false,
    items: [
      { name: 'Bhagwa Pomegranate Tissue Culture Sapling', qty: 100, price: 65, batch: 'POM-LOT-88' },
      { name: 'NPK 19:19:19 Water Soluble Foliar (1kg)', qty: 10, price: 180, batch: 'NPK-2026-11' },
    ],
    total: 8300,
    cashPaid: 8300,
    khataAmount: 0,
    date: new Date().toISOString().split('T')[0],
    timestamp: '12:30 PM',
    paymentMode: 'upi',
    requiresDelivery: true,
    challanNo: 'DC-2026-042',
    tallyVoucherStatus: 'synced',
  },
  {
    id: 'sale-004',
    invoiceNo: 'INV/2026/00104',
    customerName: 'Suresh Patil',
    customerPhone: '+91 94231 88990',
    isKhata: true,
    items: [
      { name: 'NPK 19:19:19 Water Soluble Foliar (1kg)', qty: 6, price: 180, batch: 'NPK-2026-11' },
      { name: 'Azotobacter + PSB Liquid Bio-Consortium (1L)', qty: 4, price: 320, batch: 'BIO-2026-19' },
    ],
    total: 2360,
    cashPaid: 0,
    khataAmount: 2360,
    date: new Date().toISOString().split('T')[0],
    timestamp: '02:10 PM',
    paymentMode: 'khata',
    tallyVoucherStatus: 'pending',
  },
  {
    id: 'sale-005',
    invoiceNo: 'INV/2026/00105',
    customerName: 'Vitthalrao Shinde',
    customerPhone: '+91 98812 33445',
    isKhata: false,
    items: [
      { name: 'Panchganga Super Red Onion Seed (Rabi 500g)', qty: 2, price: 1150, batch: 'ONN-2026-R1' },
      { name: 'Neem Coated Urea (46% N) - 45kg Bag', qty: 3, price: 266.5, batch: 'NCU-2026-01', isSubsidised: true, notifiedMrp: 266.5 },
    ],
    total: 3100,
    cashPaid: 3100,
    khataAmount: 0,
    date: new Date().toISOString().split('T')[0],
    timestamp: '03:45 PM',
    paymentMode: 'cash',
    hasSubsidisedItems: true,
    posTransactionId: 'IFMS-MH-2026-884302',
    buyerAuthMode: 'KCC',
    buyerIdMasked: 'KCC-MH-4412',
    tallyVoucherStatus: 'synced',
  },
];

function getStoredCustomSales(): SaleRecord[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_sales');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const fetchSales = async (): Promise<SaleRecord[]> => {
  let dbSales: SaleRecord[] = [];
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      dbSales = data.map((row: any) => ({
        id: row.id,
        invoiceNo: row.invoice_no || row.invoiceNo || `INV-${row.id}`,
        customerName: row.customer_name || row.customerName || 'Customer',
        customerPhone: row.customer_phone || row.customerPhone,
        isKhata: Boolean(row.is_khata || row.isKhata),
        items: Array.isArray(row.items) ? row.items : [],
        total: Number(row.total) || 0,
        cashPaid: Number(row.cash_paid || row.cashPaid) || 0,
        khataAmount: Number(row.khata_amount || row.khataAmount) || 0,
        date: row.date || 'Today',
        timestamp: row.timestamp || 'Just now',
        paymentMode: row.payment_mode || row.paymentMode || 'cash',
      }));
    }
  } catch {}

  const customSales = getStoredCustomSales();
  const salesMap = new Map<string, SaleRecord>();

  DEFAULT_SALES.forEach((s) => salesMap.set(s.id, s));
  customSales.forEach((s) => salesMap.set(s.id, s));
  dbSales.forEach((s) => salesMap.set(s.id, s));

  return Array.from(salesMap.values()).reverse();
};

export const insertSale = async (sale: SaleRecord): Promise<void> => {
  try {
    const customSales = getStoredCustomSales();
    customSales.unshift(sale);
    localStorage.setItem('mridaos_custom_sales', JSON.stringify(customSales.slice(0, 100)));
  } catch {}

  try {
    await supabase.from('sales').insert({
      id: sale.id,
      invoice_no: sale.invoiceNo,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      is_khata: sale.isKhata,
      items: sale.items,
      total: sale.total,
      cash_paid: sale.cashPaid,
      khata_amount: sale.khataAmount,
      date: sale.date,
      timestamp: sale.timestamp,
      payment_mode: sale.paymentMode,
    });
  } catch (err) {
    console.warn('Sale insert fallback:', err);
  }
};

// ==============================================================================
// 4. Khata (Customer & Farmer Credit Ledger) API
// ==============================================================================
export const DEFAULT_KHATA: CustomerKhata[] = [
  {
    id: 'khata-001',
    name: 'Rameshwar Tukaram Patil',
    phone: '+91 98224 55102',
    village: 'Niphad Taluka, Nashik',
    totalPurchased: 142500,
    outstandingBalance: 44000,
    creditLimit: 50000,
    creditPeriodDays: 45,
    daysOverdue: 68,
    lastPaymentDate: '2026-07-28',
    status: 'overdue',
    ageing: '61-90',
    customerType: 'credit_farmer',
    aadhaarMasked: 'XXXX-XXXX-3319',
    kccNumber: 'KCC-BOM-88210',
    landholdingAcres: 8.5,
    monthlySubsidisedBagsPurchased: 46,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Rameshwar Tukaram Patil (Niphad)',
  },
  {
    id: 'khata-002',
    name: 'Kisan Agro Syndicate (Sub-Dealer)',
    phone: '+91 98221 44556',
    village: 'Pimpalgaon Baswant Mandi',
    totalPurchased: 685000,
    outstandingBalance: 168000,
    creditLimit: 250000,
    creditPeriodDays: 30,
    daysOverdue: 22,
    lastPaymentDate: '2026-09-18',
    status: 'due_soon',
    ageing: '1-30',
    customerType: 'sub_dealer',
    aadhaarMasked: 'XXXX-XXXX-9910',
    gstin: '27AAKFK4412D1Z9',
    landholdingAcres: 0,
    monthlySubsidisedBagsPurchased: 35,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Kisan Agro Syndicate - B2B Sundry Debtor',
  },
  {
    id: 'khata-003',
    name: 'Balasaheb Thorat',
    phone: '+91 94227 89120',
    village: 'Dindori Cluster',
    totalPurchased: 98000,
    outstandingBalance: 52000,
    creditLimit: 50000,
    creditPeriodDays: 45,
    daysOverdue: 95,
    lastPaymentDate: '2026-06-15',
    status: 'blocked',
    ageing: '90+',
    customerType: 'credit_farmer',
    aadhaarMasked: 'XXXX-XXXX-7104',
    kccNumber: 'KCC-SBI-11902',
    landholdingAcres: 5.0,
    monthlySubsidisedBagsPurchased: 49,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Balasaheb Thorat (Dindori)',
  },
  {
    id: 'khata-004',
    name: 'Suresh Patil',
    phone: '+91 94231 88990',
    village: 'Ozar Mig, Nashik',
    totalPurchased: 64200,
    outstandingBalance: 18500,
    creditLimit: 40000,
    creditPeriodDays: 30,
    daysOverdue: 42,
    lastPaymentDate: '2026-08-29',
    status: 'due_soon',
    ageing: '31-60',
    customerType: 'credit_farmer',
    aadhaarMasked: 'XXXX-XXXX-6052',
    landholdingAcres: 6.2,
    monthlySubsidisedBagsPurchased: 18,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Suresh Patil (Ozar)',
  },
  {
    id: 'khata-005',
    name: 'Dnyaneshwar Gaikwad',
    phone: '+91 98220 11234',
    village: 'Sinnar Rural',
    totalPurchased: 88400,
    outstandingBalance: 8200,
    creditLimit: 50000,
    creditPeriodDays: 45,
    daysOverdue: 0,
    lastPaymentDate: '2026-10-04',
    status: 'healthy',
    ageing: 'current',
    customerType: 'credit_farmer',
    aadhaarMasked: 'XXXX-XXXX-4821',
    kccNumber: 'KCC-NDCC-5521',
    landholdingAcres: 11.0,
    monthlySubsidisedBagsPurchased: 22,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Dnyaneshwar Gaikwad (Sinnar)',
  },
  {
    id: 'khata-006',
    name: 'Sahyadri Krushi Seva Kendra (Sub-Dealer)',
    phone: '+91 97654 22190',
    village: 'Satana Market Road',
    totalPurchased: 420000,
    outstandingBalance: 85000,
    creditLimit: 150000,
    creditPeriodDays: 30,
    daysOverdue: 12,
    lastPaymentDate: '2026-09-28',
    status: 'healthy',
    ageing: '1-30',
    customerType: 'sub_dealer',
    gstin: '27ABHCS8821M1Z2',
    monthlySubsidisedBagsPurchased: 28,
    monthlySubsidyCapBags: 50,
    tallyLedgerName: 'Sahyadri Krushi Seva Kendra - Sub-Dealer',
  },
];

function getStoredKhata(): CustomerKhata[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_khata');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_khata', JSON.stringify(DEFAULT_KHATA));
    return [...DEFAULT_KHATA];
  } catch {
    return [...DEFAULT_KHATA];
  }
}

export const fetchKhataLedger = async (): Promise<CustomerKhata[]> => {
  try {
    const { data, error } = await supabase.from('khata_ledger').select('*').order('days_overdue', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        village: row.village,
        totalPurchased: Number(row.total_purchased) || 0,
        outstandingBalance: Number(row.outstanding_balance) || 0,
        creditLimit: Number(row.credit_limit) || 50000,
        daysOverdue: Number(row.days_overdue) || 0,
        lastPaymentDate: row.last_payment_date || 'N/A',
        status: row.status || 'healthy',
        ageing: row.ageing || 'current',
      }));
    }
  } catch {}

  return getStoredKhata();
};

export const fetchKhata = fetchKhataLedger;

export const updateKhataCustomer = async (id: string, updates: Partial<CustomerKhata>): Promise<void> => {
  try {
    const current = getStoredKhata().map((k) => (k.id === id ? { ...k, ...updates } : k));
    localStorage.setItem('mridaos_custom_khata', JSON.stringify(current));
  } catch {}

  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.outstandingBalance !== undefined) dbUpdates.outstanding_balance = updates.outstandingBalance;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.lastPaymentDate !== undefined) dbUpdates.last_payment_date = updates.lastPaymentDate;
    if (updates.totalPurchased !== undefined) dbUpdates.total_purchased = updates.totalPurchased;
    if (updates.daysOverdue !== undefined) dbUpdates.days_overdue = updates.daysOverdue;
    if (updates.ageing !== undefined) dbUpdates.ageing = updates.ageing;

    await supabase.from('khata_ledger').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Customer update fallback:', err);
  }
};

export const insertKhataCustomer = async (customer: CustomerKhata): Promise<void> => {
  try {
    const current = getStoredKhata().filter((k) => k.id !== customer.id);
    current.unshift(customer);
    localStorage.setItem('mridaos_custom_khata', JSON.stringify(current));
  } catch {}

  try {
    await supabase.from('khata_ledger').insert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      village: customer.village,
      total_purchased: customer.totalPurchased,
      outstanding_balance: customer.outstandingBalance,
      credit_limit: customer.creditLimit,
      days_overdue: customer.daysOverdue,
      last_payment_date: customer.lastPaymentDate,
      status: customer.status,
      ageing: customer.ageing,
    });
  } catch (err) {
    console.warn('Customer insert fallback:', err);
  }
};

export const insertCustomerKhata = insertKhataCustomer;
export const updateCustomerKhata = updateKhataCustomer;

// ==============================================================================
// 5. Purchase Orders API (With Approval Threshold & GRN Tracking)
// ==============================================================================
export const DEFAULT_POS: PurchaseOrder[] = [
  {
    id: 'po-001',
    poNumber: 'PO-2026-401',
    supplierName: 'Coromandel International Ltd',
    itemsCount: 2,
    totalAmount: 245000,
    orderDate: '2026-10-08',
    expectedDelivery: '2026-10-12',
    status: 'dispatched',
    paymentTerms: 'Credit 30 Days',
    notes: 'Priority Rabi sowing stock — DAP 150 bags & Complex 50 bags',
    requiresOwnerApproval: true,
    approvedByOwner: true,
    lineItems: [
      { itemId: 'inv-002', name: 'DAP 18:46:00 (Di-Ammonium Phosphate) 50kg', orderedQty: 150, receivedQty: 0, unitCost: 1280 },
      { itemId: 'inv-004', name: 'NPK 19:19:19 Water Soluble Foliar (1kg)', orderedQty: 380, receivedQty: 0, unitCost: 138 },
    ],
  },
  {
    id: 'po-002',
    poNumber: 'PO-2026-402',
    supplierName: 'Bayer CropScience India',
    itemsCount: 2,
    totalAmount: 118500,
    orderDate: '2026-10-09',
    expectedDelivery: '2026-10-14',
    status: 'pending_owner_approval',
    paymentTerms: 'Credit 45 Days',
    notes: 'Exceeds ₹1,00,000 threshold — Awaiting Owner Sign-off (FR-PUR-02)',
    requiresOwnerApproval: true,
    approvedByOwner: false,
    lineItems: [
      { itemId: 'inv-005', name: 'Chlorpyrifos 20% EC Insecticide (1 Litre)', orderedQty: 200, receivedQty: 0, unitCost: 365 },
      { itemId: 'inv-006', name: 'Azotobacter + PSB Liquid Bio-Consortium (1L)', orderedQty: 195, receivedQty: 0, unitCost: 230 },
    ],
  },
  {
    id: 'po-003',
    poNumber: 'PO-2026-398',
    supplierName: 'IFFCO Maharashtra State Marketing',
    itemsCount: 1,
    totalAmount: 84700,
    orderDate: '2026-10-05',
    expectedDelivery: 'Arrived at Gate',
    status: 'grn_pending',
    paymentTerms: 'RTGS Advance',
    notes: 'Truck MH-15-GV-4410 waiting at APMC Godown A for GRN batch verification',
    requiresOwnerApproval: false,
    approvedByOwner: true,
    lineItems: [
      { itemId: 'inv-001', name: 'Neem Coated Urea (46% N) - 45kg Bag', orderedQty: 350, receivedQty: 0, unitCost: 242 },
    ],
  },
  {
    id: 'po-004',
    poNumber: 'PO-2026-391',
    supplierName: 'Panchganga Seeds Pvt Ltd',
    itemsCount: 1,
    totalAmount: 92000,
    orderDate: '2026-10-01',
    expectedDelivery: 'Delivered',
    status: 'received',
    paymentTerms: 'Credit 30 Days',
    notes: 'GRN-2026-089 completed and synced to Tally Purchase Register',
    requiresOwnerApproval: false,
    approvedByOwner: true,
    lineItems: [
      { itemId: 'inv-007', name: 'Panchganga Super Red Onion Seed (Rabi 500g)', orderedQty: 100, receivedQty: 100, unitCost: 920 },
    ],
  },
];

function getStoredPOs(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_pos');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_pos', JSON.stringify(DEFAULT_POS));
    return [...DEFAULT_POS];
  } catch {
    return [...DEFAULT_POS];
  }
}

export const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        poNumber: row.po_number,
        supplierName: row.supplier_name,
        itemsCount: Number(row.items_count) || 0,
        totalAmount: Number(row.total_amount) || 0,
        orderDate: row.order_date,
        expectedDelivery: row.expected_delivery,
        status: row.status,
        paymentTerms: row.payment_terms,
        notes: row.notes,
      }));
    }
  } catch {}

  return getStoredPOs();
};

export const insertPurchaseOrder = async (po: PurchaseOrder): Promise<void> => {
  try {
    const current = getStoredPOs().filter((p) => p.id !== po.id);
    current.unshift(po);
    localStorage.setItem('mridaos_custom_pos', JSON.stringify(current));
  } catch {}

  try {
    await supabase.from('purchase_orders').insert({
      id: po.id,
      po_number: po.poNumber,
      supplier_name: po.supplierName,
      items_count: po.itemsCount,
      total_amount: po.totalAmount,
      order_date: po.orderDate,
      expected_delivery: po.expectedDelivery,
      status: po.status,
      payment_terms: po.paymentTerms,
      notes: po.notes,
    });
  } catch (err) {
    console.warn('PO insert fallback:', err);
  }
};

export const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>): Promise<void> => {
  try {
    const current = getStoredPOs().map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem('mridaos_custom_pos', JSON.stringify(current));
  } catch {}
};

// ==============================================================================
// 6. Plant Care API
// ==============================================================================
export const DEFAULT_CARE_TASKS: PlantCareTask[] = [
  {
    id: 'task-001',
    title: 'Morning Drip Fertigation (19:19:19 Foliar)',
    category: 'Fertilizing',
    section: 'Polyhouse Tunnel 1',
    timeSlot: '07:30 AM',
    plantType: 'Bhagwa Pomegranate Grafts',
    quantity: '420 Saplings',
    isCompleted: true,
    notes: 'EC 1.8 mS/cm, pH 6.2 verified',
  },
  {
    id: 'task-002',
    title: 'Overhead Fogger Misting Cycle',
    category: 'Watering',
    section: 'Greenhouse Zone A',
    timeSlot: '11:30 AM',
    plantType: 'Dutch Rose & Guava Saplings',
    quantity: '650 Units',
    isCompleted: true,
    notes: 'Triggered automatically at 27°C',
  },
  {
    id: 'task-003',
    title: 'Thrips & Mite Preventive Scouting',
    category: 'Pest Inspection',
    section: 'Shade Net Bay 3',
    timeSlot: '03:00 PM',
    plantType: 'Taiwan Pink Guava Mother Bed',
    quantity: '200 Plants',
    isCompleted: false,
    notes: 'Check yellow sticky traps and underside of tender leaves',
  },
  {
    id: 'task-004',
    title: 'Rootstock Hardening & Cocopeat Top-up',
    category: 'Repotting',
    section: 'Hardening Yard B',
    timeSlot: '04:30 PM',
    plantType: 'Keshar Mango Grafts',
    quantity: '150 Bags',
    isCompleted: false,
    notes: 'Prepare for dispatch to Satana sub-dealer',
  },
];

function getStoredCareTasks(): PlantCareTask[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_care_tasks');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_care_tasks', JSON.stringify(DEFAULT_CARE_TASKS));
    return [...DEFAULT_CARE_TASKS];
  } catch {
    return [...DEFAULT_CARE_TASKS];
  }
}

export const fetchPlantCareTasks = async (): Promise<PlantCareTask[]> => {
  try {
    const { data, error } = await supabase.from('plant_care_tasks').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        section: row.section,
        timeSlot: row.time_slot,
        plantType: row.plant_type,
        quantity: row.quantity,
        isCompleted: Boolean(row.is_completed),
        notes: row.notes,
      }));
    }
  } catch {}

  return getStoredCareTasks();
};

export const insertPlantCareTask = async (task: PlantCareTask): Promise<void> => {
  try {
    const current = getStoredCareTasks();
    current.unshift(task);
    localStorage.setItem('mridaos_custom_care_tasks', JSON.stringify(current));
  } catch {}

  try {
    await supabase.from('plant_care_tasks').insert({
      id: task.id,
      title: task.title,
      category: task.category,
      section: task.section,
      time_slot: task.timeSlot,
      plant_type: task.plantType,
      quantity: task.quantity,
      is_completed: task.isCompleted,
      notes: task.notes,
    });
  } catch (err) {
    console.warn('Plant care insert fallback:', err);
  }
};

export const updatePlantCareTask = async (id: string, updates: Partial<PlantCareTask>): Promise<void> => {
  try {
    const current = getStoredCareTasks().map((t) => (t.id === id ? { ...t, ...updates } : t));
    localStorage.setItem('mridaos_custom_care_tasks', JSON.stringify(current));
  } catch {}

  try {
    const dbUpdates: Record<string, any> = {};
    if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    await supabase.from('plant_care_tasks').update(dbUpdates).eq('id', id);
  } catch (err) {
    console.warn('Plant care update fallback:', err);
  }
};

// ==============================================================================
// 7. Sensors API
// ==============================================================================
export const fetchNurserySensors = async (): Promise<NurserySensor[]> => {
  try {
    const { data, error } = await supabase.from('nursery_sensors').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        model: row.model,
        type: (row.type as any) || 'moisture',
        value: String(row.value),
        unit: row.unit,
        status: row.status,
        location: row.location,
        lastSync: row.last_sync,
        note: row.note,
      }));
    }
  } catch {}

  return [
    {
      id: 'sen-01',
      name: 'Greenhouse Zone A (Sapling Bay)',
      model: 'AgriSense IoT-200',
      type: 'moisture',
      value: '68.5',
      unit: '%',
      status: 'optimal',
      location: 'Greenhouse Bed 1-4',
      lastSync: '1 min ago',
      note: 'Auto misting trigger threshold set at 45%',
    },
    {
      id: 'sen-02',
      name: 'Greenhouse Zone B (Grafting Nursery)',
      model: 'AgriSense Climate Pro',
      type: 'temperature',
      value: '27.2',
      unit: '°C',
      status: 'optimal',
      location: 'Tunnel 2',
      lastSync: 'Just now',
      note: 'Shade net deployment active',
    },
    {
      id: 'sen-03',
      name: 'Fertilizer Godown A (Dry Bay)',
      model: 'SafeGuard DryGuard',
      type: 'humidity',
      value: '42.0',
      unit: '%',
      status: 'optimal',
      location: 'APMC Dry Storage',
      lastSync: '5 mins ago',
      note: 'Caking & moisture ingress prevention active',
    },
  ];
};

// ==============================================================================
// 8. Compliance API
// ==============================================================================
export const fetchComplianceLicenses = async (): Promise<ComplianceLicense[]> => {
  try {
    const { data, error } = await supabase.from('compliance_licenses').select('*').order('days_remaining', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        authority: row.authority,
        licenseNumber: row.license_number,
        issueDate: row.issue_date,
        expiryDate: row.expiry_date,
        daysRemaining: Number(row.days_remaining) || 0,
        status: (row.status as any) || 'valid',
        requiredDocuments: Array.isArray(row.required_documents) ? row.required_documents : [],
      }));
    }
  } catch {}

  return [
    {
      id: 'lic-01',
      name: 'Fertilizer Retail & Wholesale License (FCO Form A2)',
      authority: 'District Agriculture Office, Nashik (Govt of Maharashtra)',
      licenseNumber: 'MH-NSK-FERT-2023-8821',
      issueDate: '2024-04-01',
      expiryDate: '2027-03-31',
      daysRemaining: 172,
      status: 'valid',
      requiredDocuments: ['Form A2 Authorization Letter', 'Principal Certificate (O-Form)', 'Godown Storage Inspection', 'iFMS PoS Device ID Mapping'],
    },
    {
      id: 'lic-02',
      name: 'Insecticide & Pesticide Retail License (Form VIII)',
      authority: 'Department of Agriculture & Farmers Welfare, Maharashtra',
      licenseNumber: 'MH-NSK-PEST-2022-4910',
      issueDate: '2023-10-30',
      expiryDate: '2026-10-30',
      daysRemaining: 20,
      status: 'renewal_due',
      requiredDocuments: ['B.Sc Agri Technical Person Proof', 'Pesticide Safety Vault Clearance', 'Principal Certificates', 'Form XIII Stock Register'],
    },
    {
      id: 'lic-03',
      name: 'Seeds Control Order Dealer License (Form B)',
      authority: 'Sub-Divisional Agriculture Officer, Nashik',
      licenseNumber: 'MH-NSK-SEED-2024-1129',
      issueDate: '2024-01-10',
      expiryDate: '2027-01-09',
      daysRemaining: 91,
      status: 'valid',
      requiredDocuments: ['Seed Germination Lot Certificates', 'Producer O-Forms', 'Lot Traceability Register'],
    },
  ];
};

// ==============================================================================
// 9. Activity Logs API
// ==============================================================================
export const DEFAULT_ACTIVITIES: ActivityLog[] = [
  {
    id: 'log-01',
    action: 'PoS / DBT Subsidy Sale Verified',
    details: 'Authenticated 4 Bags IFFCO Urea & 2 Bags DAP via Aadhaar Biometric (IFMS-MH-2026-884120)',
    user: 'Amol Kulkarni (Counter POS)',
    time: '10:45 AM',
    tag: 'sale',
    referenceId: 'INV/2026/00101',
  },
  {
    id: 'log-02',
    action: 'Tally Prime XML Voucher Pushed',
    details: 'Synced Sales Voucher INV/2026/00102 (₹18,800) to Tally Prime Server on Port 9000',
    user: 'Prashant Joshi (Tally Accountant)',
    time: '11:18 AM',
    tag: 'tally',
    referenceId: 'TLY-VCH-9942',
  },
  {
    id: 'log-03',
    action: 'Delivery Challan Dispatched',
    details: 'Vehicle MH-15-dk-7721 assigned for DC-2026-041 to Kisan Agro Syndicate, Pimpalgaon',
    user: 'Sandeep Jadhav (Godown Mgr)',
    time: '11:40 AM',
    tag: 'delivery',
    referenceId: 'DC-2026-041',
  },
  {
    id: 'log-04',
    action: 'FEFO Batch Expiry Alert Triggered',
    details: 'Batch CHP-2025-08 (Chlorpyrifos 20% EC) flagged at 21 days remaining in Godown A',
    user: 'System Watchdog',
    time: '09:00 AM',
    tag: 'inventory',
    referenceId: 'CHP-2025-08',
  },
];

function getStoredActivities(): ActivityLog[] {
  try {
    const raw = localStorage.getItem('mridaos_custom_activities');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('mridaos_custom_activities', JSON.stringify(DEFAULT_ACTIVITIES));
    return [...DEFAULT_ACTIVITIES];
  } catch {
    return [...DEFAULT_ACTIVITIES];
  }
}

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  try {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        action: row.action,
        details: row.details,
        user: row.user_name || row.user,
        time: row.time,
        tag: (row.tag as any) || 'inventory',
        referenceId: row.reference_id || row.referenceId,
      }));
    }
  } catch {}

  return getStoredActivities();
};

export const insertActivityLog = async (log: Omit<ActivityLog, 'id'>): Promise<void> => {
  const newEntry: ActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...log,
  };
  try {
    const current = getStoredActivities();
    current.unshift(newEntry);
    localStorage.setItem('mridaos_custom_activities', JSON.stringify(current.slice(0, 50)));
  } catch {}

  try {
    await supabase.from('activity_logs').insert({
      id: newEntry.id,
      action: log.action,
      details: log.details,
      user_name: log.user,
      time: log.time,
      tag: log.tag,
      reference_id: log.referenceId,
    });
  } catch (err) {
    console.warn('Activity log insert fallback:', err);
  }
};

// ==============================================================================
// 10. Seasonal Agricultural Insights API
// ==============================================================================
export const fetchSeasonalInsight = async (): Promise<SeasonalInsight | null> => {
  try {
    const { data, error } = await supabase.from('seasonal_insights').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (!error && data) {
      return {
        id: data.id,
        seasonName: data.season_name,
        currentPhase: data.current_phase,
        weatherCondition: data.weather_condition,
        highDemandProducts: Array.isArray(data.high_demand_products) ? data.high_demand_products : [],
        strategicAdvice: data.strategic_advice,
      };
    }
  } catch {}

  return {
    id: 'season-current',
    seasonName: 'Rabi Onion & Wheat Basal Dose Window (Oct–Nov)',
    currentPhase: 'Post-Monsoon Soil Preparation & Basal Fertilizer Application',
    weatherCondition: 'Clear skies across Nashik, Niphad & Pimpalgaon. Soil moisture at 68%, ideal for Rabi sowing.',
    highDemandProducts: [
      {
        name: 'DAP 18:46:00 (Di-Ammonium Phosphate) 50kg',
        expectedSurge: '+65% Basal Demand',
        stockStatus: 'needs_procurement',
        category: 'Fertilizer',
      },
      {
        name: 'Neem Coated Urea (46% N) - 45kg Bag',
        expectedSurge: '+45% Top-Dress Surge',
        stockStatus: 'adequate',
        category: 'Fertilizer',
      },
      {
        name: 'Panchganga Super Red Onion Seed (Rabi 500g)',
        expectedSurge: '+80% Nursery Demand',
        stockStatus: 'adequate',
        category: 'Seeds',
      },
      {
        name: 'Chlorpyrifos 20% EC Insecticide (1 Litre)',
        expectedSurge: '+35% Soil Drenching',
        stockStatus: 'critical',
        category: 'Pesticide',
      },
    ],
    strategicAdvice: 'Rabi basal fertilizer demand peaks over the next 18 days. Ensure PO-2026-401 (Coromandel DAP) is inwarded via GRN immediately and prioritize FEFO clearance on Chlorpyrifos batch CHP-2025-08.',
  };
};

// ==============================================================================
// 11. Nursery Cameras
// ==============================================================================
export const fetchNurseryCameras = async (): Promise<NurseryCamera[]> => {
  try {
    const { data, error } = await supabase.from('nursery_cameras').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        url: row.url || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        status: row.status,
        sensorsInfo: row.sensors_info,
      }));
    }
  } catch {}

  return [
    {
      id: 'cam-01',
      title: 'APMC Godown A — Loading Dock & Urea Bay',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      status: 'LIVE • 1080p',
      sensorsInfo: 'Temp: 26.4°C • Humidity: 42% (Dry Safe)',
    },
    {
      id: 'cam-02',
      title: 'Dindori Polyhouse Tunnel 1 — Pomegranate Bay',
      url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      status: 'LIVE • 1080p',
      sensorsInfo: 'Soil Moisture: 68.5% • Misting: Standby',
    },
  ];
};

// ==============================================================================
// 12. Operational Alerts API
// ==============================================================================
export const DEFAULT_ALERTS: OperationalAlert[] = [
  {
    id: 'alt-001',
    severity: 'critical',
    title: 'FEFO Batch Expiring in 18 Days + 1 Expired Lot Quarantined',
    description: '45 packets of NPK 19:19:19 (Batch NPK-2026-11) & 18 bottles of Chlorpyrifos (CHP-2025-08) require immediate counter push. Batch CHP-2025-01-EXP is blocked from billing (FR-INV-08).',
    category: 'inventory',
    countOrValue: '2 Critical Batches',
    timestamp: '10 mins ago',
    actionLabel: 'Open FEFO Radar',
    actionType: 'review_expiry',
  },
  {
    id: 'alt-002',
    severity: 'critical',
    title: 'DAP 18:46:00 Stock Below Reorder Threshold (65 / 80 Bags)',
    description: 'Godown A stock for regulated DAP 50kg has dropped below minimum buffer during Rabi basal sowing surge.',
    category: 'procurement',
    countOrValue: '65 Bags Left',
    timestamp: '25 mins ago',
    actionLabel: 'Inward GRN / Create PO',
    actionType: 'create_po',
  },
  {
    id: 'alt-003',
    severity: 'warning',
    title: '2 Farmer Khata Accounts Overdue > 60 Days (₹96,000)',
    description: 'Balasaheb Thorat (95d overdue, credit blocked) and Rameshwar Patil (68d overdue) require WhatsApp reminder & settlement.',
    category: 'khata',
    countOrValue: '₹96,000 Overdue',
    timestamp: '1 hour ago',
    actionLabel: 'Collect / Remind',
    actionType: 'view_khata',
  },
  {
    id: 'alt-004',
    severity: 'warning',
    title: 'Insecticide Retail License (Form VIII) Renewal Due in 20 Days',
    description: 'License MH-NSK-PEST-2022-4910 expires on 30 Oct 2026. Prepare Form XIII Stock Register & Principal O-Forms.',
    category: 'compliance',
    countOrValue: '20 Days Left',
    timestamp: '2 hours ago',
    actionLabel: 'Review FCO & Licenses',
    actionType: 'renew_license',
  },
];

export const fetchOperationalAlerts = async (): Promise<OperationalAlert[]> => {
  try {
    const { data, error } = await supabase.from('operational_alerts').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        category: row.category,
        countOrValue: row.count_or_value || row.countOrValue,
        timestamp: row.timestamp,
        actionLabel: row.action_label || row.actionLabel,
        actionType: row.action_type || row.actionType,
      }));
    }
  } catch {}

  return DEFAULT_ALERTS;
};

export const deleteOperationalAlert = async (id: string): Promise<void> => {
  try {
    await supabase.from('operational_alerts').delete().eq('id', id);
  } catch {}
};

// ==============================================================================
// 13. Mortality Records API
// ==============================================================================
export const fetchMortalityRecords = async (): Promise<MortalityRecord[]> => {
  try {
    const { data, error } = await supabase.from('mortality_records').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        date: row.date,
        plantName: row.plant_name,
        quantityLost: Number(row.quantity_lost) || 0,
        estimatedValue: Number(row.estimated_value) || 0,
        reason: row.reason,
        section: row.section,
      }));
    }
  } catch {}

  return [
    {
      id: 'mort-01',
      date: '2026-10-08',
      plantName: 'Dutch Rose Grafted Sapling',
      quantityLost: 12,
      estimatedValue: 1020,
      reason: 'Fungal Blight',
      section: 'Greenhouse Zone A',
    },
    {
      id: 'mort-02',
      date: '2026-10-05',
      plantName: 'Taiwan Pink Guava Grafts',
      quantityLost: 6,
      estimatedValue: 840,
      reason: 'Transit Damage',
      section: 'Hardening Yard B',
    },
  ];
};

// ==============================================================================
// 14. PRD MODULE: Supplier Master & Price Lists (Section 6.1)
// ==============================================================================
export const DEFAULT_SUPPLIERS: SupplierMaster[] = [
  {
    id: 'sup-001',
    firmName: 'IFFCO Maharashtra State Marketing',
    gstin: '27AAACI1122F1Z8',
    fcoLicenseNo: 'FCO/MFG/MH/2021-009',
    fcoLicenseExpiry: '2028-03-31',
    address: 'IFFCO Bhavan, Shivajinagar, Pune - 411005',
    contactPerson: 'Suhas Deshpande (Area Mgr)',
    phone: '+91 20 2553 8801',
    bankDetails: 'SBI A/c 10992837461 • IFSC: SBIN0000454',
    categoriesSupplied: ['Fertilizer', 'Bio-Fertilizer'],
    creditPeriodDays: 15,
    creditLimit: 500000,
    outstandingPayable: 84700,
    onTimeDeliveryPct: 96,
    rejectionPct: 0.4,
    fillRatePct: 98,
    tallyLedgerName: 'IFFCO Maharashtra State Mktg - Sundry Creditor',
    priceList: [
      { productName: 'Neem Coated Urea (46% N) - 45kg Bag', sku: 'IFFCO-NCU-45', purchaseRate: 242, notifiedMrp: 266.5, schemeDiscountPct: 0, effectiveDate: '2026-04-01' },
      { productName: 'Azotobacter + PSB Liquid Bio-Consortium (1L)', sku: 'BIO-AZO-1L', purchaseRate: 230, notifiedMrp: 320, schemeDiscountPct: 5, effectiveDate: '2026-06-01' },
    ],
  },
  {
    id: 'sup-002',
    firmName: 'Coromandel International Ltd',
    gstin: '27AAACC7788K1Z3',
    fcoLicenseNo: 'FCO/MFG/AP-MH/2020-412',
    fcoLicenseExpiry: '2027-09-30',
    address: 'Gromor Regional Depot, MIDC Ambad, Nashik - 422010',
    contactPerson: 'Mahesh Shinde',
    phone: '+91 98231 00912',
    bankDetails: 'HDFC Bank A/c 50200044112299 • IFSC: HDFC0000124',
    categoriesSupplied: ['Fertilizer', 'Pesticide'],
    creditPeriodDays: 30,
    creditLimit: 800000,
    outstandingPayable: 245000,
    onTimeDeliveryPct: 92,
    rejectionPct: 1.1,
    fillRatePct: 94,
    tallyLedgerName: 'Coromandel International Ltd - Creditor',
    priceList: [
      { productName: 'DAP 18:46:00 (Di-Ammonium Phosphate) 50kg', sku: 'CORO-DAP-50', purchaseRate: 1280, notifiedMrp: 1350, schemeDiscountPct: 1.5, effectiveDate: '2026-04-01' },
    ],
  },
  {
    id: 'sup-003',
    firmName: 'Bayer CropScience India',
    gstin: '27AAACB4411P1Z1',
    fcoLicenseNo: 'CIB/PEST/MH/2019-884',
    fcoLicenseExpiry: '2026-11-02',
    address: 'Bayer House, Hiranandani Estate, Thane West - 400607',
    contactPerson: 'Kiran Sonawane',
    phone: '+91 99220 77412',
    bankDetails: 'ICICI Bank A/c 000405112288 • IFSC: ICIC0000004',
    categoriesSupplied: ['Pesticide', 'Seeds'],
    creditPeriodDays: 45,
    creditLimit: 600000,
    outstandingPayable: 118500,
    onTimeDeliveryPct: 94,
    rejectionPct: 0.8,
    fillRatePct: 95,
    tallyLedgerName: 'Bayer CropScience Ltd - Creditor',
    priceList: [
      { productName: 'Chlorpyrifos 20% EC Insecticide (1 Litre)', sku: 'BAY-CHL-1L', purchaseRate: 365, notifiedMrp: 450, schemeDiscountPct: 4, effectiveDate: '2026-07-01' },
    ],
  },
  {
    id: 'sup-004',
    firmName: 'Mahadhan AgriTech (Smartchem)',
    gstin: '27AAACS9910L1Z5',
    fcoLicenseNo: 'FCO/MFG/MH/2022-319',
    fcoLicenseExpiry: '2027-12-31',
    address: 'Plot K-1, MIDC Taloja, Raigad / Nashik Depot',
    contactPerson: 'Nitin Bhosale',
    phone: '+91 98500 33129',
    bankDetails: 'Axis Bank A/c 91802004455112 • IFSC: UTIB0000109',
    categoriesSupplied: ['Fertilizer'],
    creditPeriodDays: 30,
    creditLimit: 500000,
    outstandingPayable: 42000,
    onTimeDeliveryPct: 89,
    rejectionPct: 1.5,
    fillRatePct: 91,
    tallyLedgerName: 'Mahadhan AgriTech Ltd - Creditor',
    priceList: [
      { productName: 'NPK 19:19:19 Water Soluble Foliar (1kg)', sku: 'MAHA-NPK19-1KG', purchaseRate: 138, notifiedMrp: 180, schemeDiscountPct: 6, effectiveDate: '2026-08-01' },
    ],
  },
];

// ==============================================================================
// 15. PRD MODULE: Godown Master & Inter-Godown Stock Transfers (Section 6.3)
// ==============================================================================
export const DEFAULT_GODOWNS: GodownMaster[] = [
  {
    id: 'godown-apmc-1',
    name: 'Godown A — APMC Main Basal Storage',
    code: 'GDN-NSK-01',
    branchId: 'nashik-central',
    location: 'Plot 42, Panchavati APMC Yard, Nashik',
    managerName: 'Sandeep Jadhav',
    capacityBags: 2500,
    occupiedBags: 1420,
    stockValue: 748500,
  },
  {
    id: 'godown-pimpalgaon-2',
    name: 'Godown B — Pimpalgaon Mandi Buffer Warehouse',
    code: 'GDN-PMP-02',
    branchId: 'pimpalgaon-branch',
    location: 'Gate 2, Onion Market Road, Pimpalgaon',
    managerName: 'Vikas Gaikwad',
    capacityBags: 1500,
    occupiedBags: 810,
    stockValue: 412000,
  },
  {
    id: 'godown-dindori-3',
    name: 'Godown C — Dindori Cold & Nursery Store',
    code: 'GDN-DND-03',
    branchId: 'dindori-nursery',
    location: 'Vani Highway, Dindori',
    managerName: 'Sunita More',
    capacityBags: 800,
    occupiedBags: 490,
    stockValue: 215000,
  },
];

export const DEFAULT_STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 'trf-001',
    transferNo: 'STN-2026-019',
    fromGodownId: 'godown-apmc-1',
    fromGodownName: 'Godown A — APMC Main Basal Storage',
    toGodownId: 'godown-pimpalgaon-2',
    toGodownName: 'Godown B — Pimpalgaon Mandi Buffer Warehouse',
    productName: 'Neem Coated Urea (46% N) - 45kg Bag',
    batchNumber: 'NCU-2026-01',
    quantity: 80,
    unit: 'Bags',
    initiatedDate: '2026-10-10',
    status: 'in_transit',
    vehicleNo: 'MH-15-CQ-9012',
  },
  {
    id: 'trf-002',
    transferNo: 'STN-2026-018',
    fromGodownId: 'godown-pimpalgaon-2',
    fromGodownName: 'Godown B — Pimpalgaon Mandi Buffer Warehouse',
    toGodownId: 'godown-apmc-1',
    toGodownName: 'Godown A — APMC Main Basal Storage',
    productName: 'Panchganga Super Red Onion Seed (Rabi 500g)',
    batchNumber: 'ONN-2026-R1',
    quantity: 25,
    unit: 'Pouch',
    initiatedDate: '2026-10-08',
    status: 'received',
    vehicleNo: 'MH-15-AB-3321',
  },
];

// ==============================================================================
// 16. PRD MODULE: Delivery Challans & Proof of Delivery (Section 6.7)
// ==============================================================================
export const DEFAULT_DELIVERIES: DeliveryChallan[] = [
  {
    id: 'del-001',
    challanNo: 'DC-2026-041',
    invoiceNo: 'INV/2026/00102',
    saleId: 'sale-002',
    customerName: 'Kisan Agro Syndicate (Sub-Dealer)',
    customerPhone: '+91 98221 44556',
    destinationVillage: 'Pimpalgaon Baswant Mandi, Gate 4',
    itemsSummary: '10 Bags MOP 50kg, 5 Bottles Chlorpyrifos 1L',
    totalBagsOrUnits: 15,
    vehicleNumber: 'MH-15-DK-7721 (Mahindra Bolero Pickup)',
    driverName: 'Santosh Wagh',
    driverPhone: '+91 97641 11223',
    scheduledDate: '2026-10-10',
    status: 'dispatched',
  },
  {
    id: 'del-002',
    challanNo: 'DC-2026-042',
    invoiceNo: 'INV/2026/00103',
    saleId: 'sale-003',
    customerName: 'GreenValley Orchards (B2B)',
    customerPhone: '+91 98230 77889',
    destinationVillage: 'Vani-Dindori Road, Plot 18',
    itemsSummary: '100 Bhagwa Pomegranate Saplings, 10 Pkts NPK 19:19:19',
    totalBagsOrUnits: 110,
    vehicleNumber: 'MH-15-EF-4509 (Tata Ace Gold)',
    driverName: 'Kailas Jadhav',
    driverPhone: '+91 98229 33410',
    scheduledDate: '2026-10-10',
    status: 'pending',
  },
  {
    id: 'del-003',
    challanNo: 'DC-2026-039',
    invoiceNo: 'INV/2026/00098',
    saleId: 'sale-000',
    customerName: 'Sahyadri Krushi Seva Kendra (Sub-Dealer)',
    customerPhone: '+91 97654 22190',
    destinationVillage: 'Satana Market Road',
    itemsSummary: '60 Bags IFFCO Neem Coated Urea 45kg',
    totalBagsOrUnits: 60,
    vehicleNumber: 'MH-15-DK-7721 (Mahindra Bolero Pickup)',
    driverName: 'Santosh Wagh',
    driverPhone: '+91 97641 11223',
    scheduledDate: '2026-10-09',
    status: 'delivered',
    podType: 'otp',
    podReference: 'OTP-8841 Verified by Receiver',
    podTimestamp: '2026-10-09 04:15 PM',
  },
];

// ==============================================================================
// 17. PRD MODULE: Tally Prime Integration & Sync Queue (Section 6.10)
// ==============================================================================
export const DEFAULT_TALLY_VOUCHERS: TallySyncVoucher[] = [
  {
    id: 'tly-001',
    voucherNo: 'INV/2026/00101',
    voucherType: 'Sales',
    date: '2026-10-10',
    partyLedgerName: 'Dnyaneshwar Gaikwad (Sinnar)',
    amount: 3766,
    gstAmount: 179.33,
    narration: 'POS Subsidy Bill #INV/2026/00101 • iFMS Ref IFMS-MH-2026-884120 • Paid via UPI',
    status: 'synced',
    lastSyncAttempt: '10:45:12 AM',
    referenceId: 'sale-001',
    xmlPayloadPreview: `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>20261010</DATE><VOUCHERNUMBER>INV/2026/00101</VOUCHERNUMBER><PARTYLEDGERNAME>Dnyaneshwar Gaikwad (Sinnar)</PARTYLEDGERNAME><AMOUNT>-3766.00</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`,
  },
  {
    id: 'tly-002',
    voucherNo: 'INV/2026/00102',
    voucherType: 'Sales',
    date: '2026-10-10',
    partyLedgerName: 'Kisan Agro Syndicate - B2B Sundry Debtor',
    amount: 18800,
    gstAmount: 1131.19,
    narration: 'B2B Credit Split Bill #INV/2026/00102 • GSTIN 27AAKFK4412D1Z9 • Challan DC-2026-041',
    status: 'synced',
    lastSyncAttempt: '11:15:30 AM',
    referenceId: 'sale-002',
    xmlPayloadPreview: `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>20261010</DATE><VOUCHERNUMBER>INV/2026/00102</VOUCHERNUMBER><PARTYGSTIN>27AAKFK4412D1Z9</PARTYGSTIN><PARTYLEDGERNAME>Kisan Agro Syndicate - B2B Sundry Debtor</PARTYLEDGERNAME><AMOUNT>-18800.00</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`,
  },
  {
    id: 'tly-003',
    voucherNo: 'INV/2026/00104',
    voucherType: 'Sales',
    date: '2026-10-10',
    partyLedgerName: 'Suresh Patil (Ozar)',
    amount: 2360,
    gstAmount: 225.71,
    narration: 'Khata Credit Sale #INV/2026/00104 • NPK 19:19:19 & Azotobacter Bio',
    status: 'pending',
    lastSyncAttempt: 'Queued for next poll',
    referenceId: 'sale-004',
    xmlPayloadPreview: `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>20261010</DATE><VOUCHERNUMBER>INV/2026/00104</VOUCHERNUMBER><PARTYLEDGERNAME>Suresh Patil (Ozar)</PARTYLEDGERNAME><AMOUNT>-2360.00</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`,
  },
  {
    id: 'tly-004',
    voucherNo: 'PINV/CORO/882',
    voucherType: 'Purchase',
    date: '2026-10-09',
    partyLedgerName: 'Coromandel International Ltd - Creditor',
    amount: 192000,
    gstAmount: 9142.85,
    narration: 'GRN Inward against PO-2026-385 • 150 Bags Gromor DAP 50kg',
    status: 'failed',
    lastSyncAttempt: '09:30:05 AM',
    errorMessage: 'Ledger "Gromor Input CGST 2.5%" not mapped in Tally Prime Master. Click Resync after auto-mapping.',
    referenceId: 'po-001',
    xmlPayloadPreview: `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Purchase" ACTION="Create"><DATE>20261009</DATE><VOUCHERNUMBER>PINV/CORO/882</VOUCHERNUMBER><PARTYLEDGERNAME>Coromandel International Ltd - Creditor</PARTYLEDGERNAME><AMOUNT>192000.00</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`,
  },
  {
    id: 'tly-005',
    voucherNo: 'REC/2026/0811',
    voucherType: 'Receipt',
    date: '2026-10-10',
    partyLedgerName: 'Dnyaneshwar Gaikwad (Sinnar)',
    amount: 12000,
    gstAmount: 0,
    narration: 'Khata Oldest-Invoice-First Receipt via UPI (UTR: 628319904412)',
    status: 'synced',
    lastSyncAttempt: '10:12:44 AM',
    referenceId: 'khata-005',
    xmlPayloadPreview: `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Receipt" ACTION="Create"><DATE>20261010</DATE><VOUCHERNUMBER>REC/2026/0811</VOUCHERNUMBER><PARTYLEDGERNAME>Dnyaneshwar Gaikwad (Sinnar)</PARTYLEDGERNAME><AMOUNT>12000.00</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`,
  },
];

// ==============================================================================
// 18. PRD MODULE: Scheme Master & PoS/DBT Subsidy Logs (Section 6.8 & 6.11)
// ==============================================================================
export const DEFAULT_SCHEMES: SchemeRule[] = [
  {
    id: 'sch-001',
    schemeName: 'Rabi Foliar Volume Discount (5%+)',
    code: 'RABI-NPK-5',
    applicableCategory: 'Fertilizer',
    minQty: 5,
    discountPct: 5,
    validUntil: '2026-11-30',
    isActive: true,
    description: 'Auto-applies 5% volume discount on non-subsidised water-soluble NPK & micronutrients when qty >= 5.',
  },
  {
    id: 'sch-002',
    schemeName: 'Sub-Dealer Bulk Crop Protection Scheme',
    code: 'B2B-PEST-8',
    applicableCategory: 'Pesticide',
    minQty: 10,
    discountPct: 8,
    validUntil: '2026-12-15',
    isActive: true,
    description: '8% trade scheme on Bayer & Syngenta pesticides for orders of 10+ bottles.',
  },
  {
    id: 'sch-003',
    schemeName: 'Orchard Plantation Sapling Bundle',
    code: 'ORCHARD-100',
    applicableCategory: 'Plant/Sapling',
    minQty: 50,
    discountPct: 6,
    validUntil: '2026-11-15',
    isActive: true,
    description: '6% seasonal rebate on 50+ grafted pomegranate or guava saplings.',
  },
];

export const DEFAULT_POS_SUBSIDY_LOGS: PosSubsidyRecord[] = [
  {
    id: 'pos-001',
    posTxnId: 'IFMS-MH-2026-884120',
    invoiceNo: 'INV/2026/00101',
    date: '2026-10-10',
    buyerName: 'Dnyaneshwar Gaikwad',
    authMode: 'Aadhaar Biometric',
    aadhaarHash: 'SHA256:9f86d081884c7d659a2feaa0c55ad015...4821',
    productName: 'Neem Coated Urea (45kg) × 4 + DAP (50kg) × 2',
    bagsCount: 6,
    notifiedMrpTotal: 3766,
    govtSubsidyClaimed: 8940,
    reconciledWithIfms: true,
  },
  {
    id: 'pos-002',
    posTxnId: 'IFMS-MH-2026-884195',
    invoiceNo: 'INV/2026/00102',
    date: '2026-10-10',
    buyerName: 'Kisan Agro Syndicate (Sub-Dealer)',
    authMode: 'Aadhaar Biometric',
    aadhaarHash: 'SHA256:4b227777d4dd1fc61c6f884f48641d02...9910',
    productName: 'MOP - Muriate of Potash (50kg) × 10',
    bagsCount: 10,
    notifiedMrpTotal: 16550,
    govtSubsidyClaimed: 7200,
    reconciledWithIfms: true,
  },
  {
    id: 'pos-003',
    posTxnId: 'IFMS-MH-2026-884302',
    invoiceNo: 'INV/2026/00105',
    date: '2026-10-10',
    buyerName: 'Vitthalrao Shinde',
    authMode: 'Kisan Credit Card (KCC)',
    aadhaarHash: 'SHA256:e3b0c44298fc1c149afbf4c8996fb924...4412',
    productName: 'Neem Coated Urea (45kg) × 3',
    bagsCount: 3,
    notifiedMrpTotal: 799.5,
    govtSubsidyClaimed: 4725,
    reconciledWithIfms: true,
  },
];

// ==============================================================================
// REALTIME LISTENER
// ==============================================================================
export const subscribeToRealtimeChanges = (onDataChange: (table: string, payload: any) => void) => {
  const channel = supabase
    .channel('public:mridaos_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        onDataChange(payload.table, payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
