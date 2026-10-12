import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  Layers,
  MapPin,
  Route,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Move,
  Info,
  Clock,
  Weight,
  Sparkles,
  Warehouse,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';

interface GodownRackSlot {
  id: string; // e.g. BAY-A-R1-T1
  bayId: 'BAY-A' | 'BAY-B' | 'BAY-C' | 'BAY-D' | 'BAY-E';
  bayName: string;
  category: string;
  aisle: number;
  rack: number;
  tier: 1 | 2 | 3;
  x: number; // visual grid coordinate
  y: number;
  itemId?: string;
  itemName: string;
  batchNumber: string;
  bagsCount: number;
  weightMt: number;
  daysRemaining: number;
  expiryDate: string;
  status: 'healthy' | 'warning' | 'expired' | 'empty';
  isQuarantined?: boolean;
}

const INITIAL_RACK_SLOTS: GodownRackSlot[] = [
  // BAY A: Nitrogenous (Urea & Neem Coated)
  {
    id: 'BAY-A-R1-T1',
    bayId: 'BAY-A',
    bayName: 'Bay A (Urea & Nitrates)',
    category: 'Nitrogenous',
    aisle: 1,
    rack: 1,
    tier: 1,
    x: 80,
    y: 100,
    itemName: 'Neem Coated Urea (45kg)',
    batchNumber: 'NCU-2026-01',
    bagsCount: 120,
    weightMt: 5.4,
    daysRemaining: 340,
    expiryDate: '2026-12-15',
    status: 'healthy',
  },
  {
    id: 'BAY-A-R1-T2',
    bayId: 'BAY-A',
    bayName: 'Bay A (Urea & Nitrates)',
    category: 'Nitrogenous',
    aisle: 1,
    rack: 1,
    tier: 2,
    x: 80,
    y: 180,
    itemName: 'Neem Coated Urea (45kg)',
    batchNumber: 'NCU-2025-09',
    bagsCount: 45,
    weightMt: 2.0,
    daysRemaining: 42,
    expiryDate: '2026-04-20',
    status: 'warning',
  },
  {
    id: 'BAY-A-R2-T1',
    bayId: 'BAY-A',
    bayName: 'Bay A (Urea & Nitrates)',
    category: 'Nitrogenous',
    aisle: 1,
    rack: 2,
    tier: 1,
    x: 180,
    y: 100,
    itemName: 'IFFCO Nano Urea (500ml)',
    batchNumber: 'NU-2025-08',
    bagsCount: 80,
    weightMt: 0.8,
    daysRemaining: 18,
    expiryDate: '2026-03-29',
    status: 'expired',
    isQuarantined: true,
  },
  {
    id: 'BAY-A-R2-T2',
    bayId: 'BAY-A',
    bayName: 'Bay A (Urea & Nitrates)',
    category: 'Nitrogenous',
    aisle: 1,
    rack: 2,
    tier: 2,
    x: 180,
    y: 180,
    itemName: 'Calcium Nitrate (25kg)',
    batchNumber: 'CN-2026-02',
    bagsCount: 95,
    weightMt: 2.37,
    daysRemaining: 280,
    expiryDate: '2026-11-05',
    status: 'healthy',
  },

  // BAY B: Phosphatic (DAP & SSP)
  {
    id: 'BAY-B-R1-T1',
    bayId: 'BAY-B',
    bayName: 'Bay B (DAP & Phosphates)',
    category: 'Phosphatic',
    aisle: 2,
    rack: 1,
    tier: 1,
    x: 320,
    y: 100,
    itemName: 'DAP 18:46:00 (50kg)',
    batchNumber: 'DAP-2026-01',
    bagsCount: 150,
    weightMt: 7.5,
    daysRemaining: 290,
    expiryDate: '2026-11-20',
    status: 'healthy',
  },
  {
    id: 'BAY-B-R1-T2',
    bayId: 'BAY-B',
    bayName: 'Bay B (DAP & Phosphates)',
    category: 'Phosphatic',
    aisle: 2,
    rack: 1,
    tier: 2,
    x: 320,
    y: 180,
    itemName: 'DAP 18:46:00 (50kg)',
    batchNumber: 'DAP-2025-11',
    bagsCount: 30,
    weightMt: 1.5,
    daysRemaining: 35,
    expiryDate: '2026-04-12',
    status: 'warning',
  },
  {
    id: 'BAY-B-R2-T1',
    bayId: 'BAY-B',
    bayName: 'Bay B (DAP & Phosphates)',
    category: 'Phosphatic',
    aisle: 2,
    rack: 2,
    tier: 1,
    x: 420,
    y: 100,
    itemName: 'Single Super Phosphate SSP (50kg)',
    batchNumber: 'SSP-2026-03',
    bagsCount: 110,
    weightMt: 5.5,
    daysRemaining: 310,
    expiryDate: '2026-12-01',
    status: 'healthy',
  },

  // BAY C: Complex NPK & Potash
  {
    id: 'BAY-C-R1-T1',
    bayId: 'BAY-C',
    bayName: 'Bay C (NPK & Potash)',
    category: 'Potassic & Complex',
    aisle: 3,
    rack: 1,
    tier: 1,
    x: 560,
    y: 100,
    itemName: 'NPK 10:26:26 (50kg)',
    batchNumber: 'NPK-2026-04',
    bagsCount: 85,
    weightMt: 4.25,
    daysRemaining: 240,
    expiryDate: '2026-09-15',
    status: 'healthy',
  },
  {
    id: 'BAY-C-R1-T2',
    bayId: 'BAY-C',
    bayName: 'Bay C (NPK & Potash)',
    category: 'Potassic & Complex',
    aisle: 3,
    rack: 1,
    tier: 2,
    x: 560,
    y: 180,
    itemName: 'Muriate of Potash MOP (50kg)',
    batchNumber: 'MOP-2025-12',
    bagsCount: 22,
    weightMt: 1.1,
    daysRemaining: 55,
    expiryDate: '2026-05-02',
    status: 'warning',
  },

  // BAY D: Micronutrients, Bio-fertilizers & Water Solubles
  {
    id: 'BAY-D-R1-T1',
    bayId: 'BAY-D',
    bayName: 'Bay D (Bio & Micronutrients)',
    category: 'Micronutrients',
    aisle: 4,
    rack: 1,
    tier: 1,
    x: 700,
    y: 100,
    itemName: 'Zinc Sulphate Monohydrate 33% (10kg)',
    batchNumber: 'ZN-2026-01',
    bagsCount: 140,
    weightMt: 1.4,
    daysRemaining: 400,
    expiryDate: '2027-02-10',
    status: 'healthy',
  },
  {
    id: 'BAY-D-R1-T2',
    bayId: 'BAY-D',
    bayName: 'Bay D (Bio & Micronutrients)',
    category: 'Micronutrients',
    aisle: 4,
    rack: 1,
    tier: 2,
    x: 700,
    y: 180,
    itemName: 'Mycorrhiza Bio-Fertilizer (4kg)',
    batchNumber: 'MYCO-2025-10',
    bagsCount: 15,
    weightMt: 0.06,
    daysRemaining: 25,
    expiryDate: '2026-04-05',
    status: 'expired',
    isQuarantined: true,
  },

  // BAY E: High-Security Pesticide Cage (Restricted Access)
  {
    id: 'BAY-E-R1-T1',
    bayId: 'BAY-E',
    bayName: 'Bay E (Restricted Pesticide Cage)',
    category: 'Crop Protection',
    aisle: 5,
    rack: 1,
    tier: 1,
    x: 840,
    y: 100,
    itemName: 'Coragen Chlorantraniliprole 18.5% (150ml)',
    batchNumber: 'COR-2026-05',
    bagsCount: 60,
    weightMt: 0.12,
    daysRemaining: 420,
    expiryDate: '2027-04-10',
    status: 'healthy',
  },
  {
    id: 'BAY-E-R1-T2',
    bayId: 'BAY-E',
    bayName: 'Bay E (Restricted Pesticide Cage)',
    category: 'Crop Protection',
    aisle: 5,
    rack: 1,
    tier: 2,
    x: 840,
    y: 180,
    itemName: 'Mancozeb 75% WP Fungicide (1kg)',
    batchNumber: 'MCZ-2026-02',
    bagsCount: 40,
    weightMt: 0.04,
    daysRemaining: 50,
    expiryDate: '2026-04-30',
    status: 'warning',
  },
];

export const GodownDigitalTwinView: React.FC = () => {
  const { currentBranch, showToast } = useApp();
  const [slots, setSlots] = useState<GodownRackSlot[]>(INITIAL_RACK_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState<GodownRackSlot | null>(INITIAL_RACK_SLOTS[0]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPickerRouteActive, setIsPickerRouteActive] = useState(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D_ISO'>('2D');

  // FEFO KPI Statistics
  const stats = useMemo(() => {
    const totalBags = slots.reduce((acc, s) => acc + s.bagsCount, 0);
    const totalWeightMt = slots.reduce((acc, s) => acc + s.weightMt, 0);
    const healthyCount = slots.filter((s) => s.status === 'healthy').length;
    const warningCount = slots.filter((s) => s.status === 'warning').length;
    const expiredCount = slots.filter((s) => s.status === 'expired' || s.isQuarantined).length;
    return { totalBags, totalWeightMt, healthyCount, warningCount, expiredCount };
  }, [slots]);

  // Filtered racks
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      const matchCat = filterCategory === 'all' || s.bayId === filterCategory;
      const matchSearch =
        s.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [slots, filterCategory, searchQuery]);

  // Simulated Picker Route: Optimal path starting from Dock Inwarding through racks to Dispatch Staging
  const pickerRouteStops = useMemo(() => {
    return [
      { step: 1, name: 'Inwarding Dock Gate A', x: 20, y: 320, action: 'Pickup Hand Cart' },
      { step: 2, name: 'Bay A Rack 1 (Urea)', x: 80, y: 180, action: 'Pick 2 bags (Exp: 42d priority)' },
      { step: 3, name: 'Bay B Rack 1 (DAP)', x: 320, y: 180, action: 'Pick 1 bag (Exp: 35d priority)' },
      { step: 4, name: 'Bay C Rack 1 (Potash)', x: 560, y: 180, action: 'Pick 1 bag (Exp: 55d priority)' },
      { step: 5, name: 'Staging & Dispatch Dock', x: 880, y: 320, action: 'Weigh & Load to Delivery Pickup' },
    ];
  }, []);

  const handleToggleQuarantine = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const nextQ = !s.isQuarantined;
          showToast(
            nextQ ? `🔒 Pallet ${s.id} Quarantined: Blocked from Counter POS` : `✅ Pallet ${s.id} Released from Quarantine`,
            nextQ ? 'error' : 'success'
          );
          return {
            ...s,
            isQuarantined: nextQ,
            status: nextQ ? 'expired' : s.daysRemaining < 60 ? 'warning' : 'healthy',
          };
        }
        return s;
      })
    );
  };

  const getStatusColor = (status: GodownRackSlot['status'], isQuarantined?: boolean) => {
    if (isQuarantined) return 'fill-rose-600 stroke-rose-800 text-rose-500 bg-rose-50 border-rose-300';
    switch (status) {
      case 'healthy':
        return 'fill-emerald-500 stroke-emerald-700 text-emerald-600 bg-emerald-50 border-emerald-300';
      case 'warning':
        return 'fill-amber-500 stroke-amber-700 text-amber-600 bg-amber-50 border-amber-300';
      case 'expired':
        return 'fill-rose-500 stroke-rose-700 text-rose-600 bg-rose-50 border-rose-300';
      default:
        return 'fill-slate-300 stroke-slate-400 text-slate-500 bg-slate-50 border-slate-300';
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-[#079455]/10 text-[#079455]">
              <Warehouse className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#E8F0E8] tracking-tight">
              Godown Digital Twin & Visual FEFO Planogram
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0EAE4] dark:bg-[#1E3A24] text-[#079455] dark:text-[#4ADE80]">
              {currentBranch?.name || 'Nashik Central Main Godown'}
            </span>
          </div>
          <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
            Real-time visual map of warehouse Bays, Aisles, and Pallet Racks with FEFO color expiration tracking and optimized picker walking routes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-[#F0F4F1] dark:bg-[#1A1F1A] p-1 rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                viewMode === '2D' ? 'bg-[#079455] text-white shadow-2xs' : 'text-[#6E7B74] hover:text-[#1A1A1A]'
              }`}
            >
              2D Floor Map
            </button>
            <button
              onClick={() => setViewMode('3D_ISO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                viewMode === '3D_ISO' ? 'bg-[#079455] text-white shadow-2xs' : 'text-[#6E7B74] hover:text-[#1A1A1A]'
              }`}
            >
              3D Isometric View
            </button>
          </div>

          <button
            onClick={() => {
              setIsPickerRouteActive(!isPickerRouteActive);
              showToast(
                !isPickerRouteActive
                  ? '⚡ Picker Route Computed: 4 stops, 142m walking distance, 4.2 min estimated pick time'
                  : 'Picker route visualizer hidden',
                'info'
              );
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              isPickerRouteActive
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#1A1A1A] dark:bg-[#353D35] hover:bg-black text-white'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>{isPickerRouteActive ? 'Hide Picker Route' : 'Optimize Picker Route'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#242924] rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
          <span className="text-[11px] font-bold text-[#6E7B74] block uppercase">Total Bags in Godown</span>
          <span className="text-xl font-black text-[#1A1A1A] dark:text-[#E8F0E8]">{stats.totalBags.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-[#6E7B74] block mt-0.5">{stats.totalWeightMt.toFixed(1)} Metric Tonnes</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#242924] rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Healthy (&gt;180d)</span>
          </div>
          <span className="text-xl font-black text-emerald-800 dark:text-emerald-300">{stats.healthyCount} Pallets</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Optimal shelf life</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#242924] rounded-2xl border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Near Expiry (30-60d)</span>
          </div>
          <span className="text-xl font-black text-amber-800 dark:text-amber-300">{stats.warningCount} Pallets</span>
          <span className="text-[10px] text-amber-600 block mt-0.5">Prioritize dispatch</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#242924] rounded-2xl border border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">Expired / Locked</span>
          </div>
          <span className="text-xl font-black text-rose-800 dark:text-rose-300">{stats.expiredCount} Pallets</span>
          <span className="text-[10px] text-rose-600 block mt-0.5">Quarantine locked</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#242924] rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-[#6E7B74] block uppercase">Picker Efficiency</span>
          <span className="text-xl font-black text-[#079455]">94.2%</span>
          <span className="text-[10px] text-[#6E7B74] block mt-0.5">FEFO route automated</span>
        </div>
      </div>

      {/* Main Floor Plan & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Interactive SVG Planogram Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow flex flex-col">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Bays' },
                { id: 'BAY-A', label: 'Bay A (Urea)' },
                { id: 'BAY-B', label: 'Bay B (DAP)' },
                { id: 'BAY-C', label: 'Bay C (Potash)' },
                { id: 'BAY-D', label: 'Bay D (Bio)' },
                { id: 'BAY-E', label: 'Bay E (Pesticides)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterCategory(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    filterCategory === tab.id
                      ? 'bg-[#079455] text-white shadow-2xs'
                      : 'bg-[#F0F4F1] dark:bg-[#1A1F1A] text-[#6E7B74] hover:text-[#1A1A1A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU / Batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#079455]"
              />
            </div>
          </div>

          {/* Interactive SVG Godown Floor Layout */}
          <div className="relative w-full overflow-x-auto bg-[#F9FBFA] dark:bg-[#1C211C] rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-4">
            <svg
              viewBox="0 0 1000 400"
              className="w-full min-w-[700px] h-auto select-none"
              style={{
                transform: viewMode === '3D_ISO' ? 'rotateX(20deg) rotateZ(-3deg) scale(0.95)' : 'none',
                transition: 'transform 0.4s ease',
              }}
            >
              {/* Floor Grid Lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2EAE5" strokeWidth="0.5" strokeOpacity="0.6" />
                </pattern>
              </defs>
              <rect width="1000" height="400" fill="url(#grid)" />

              {/* Warehouse Bays Boundaries */}
              {/* Bay A */}
              <rect x="50" y="50" width="200" height="220" rx="12" fill="#E8F5E9" fillOpacity="0.4" stroke="#81C784" strokeDasharray="4 4" />
              <text x="65" y="75" fontSize="11" fontWeight="bold" fill="#2E7D32">BAY A • UREA</text>

              {/* Bay B */}
              <rect x="290" y="50" width="200" height="220" rx="12" fill="#E3F2FD" fillOpacity="0.4" stroke="#64B5F6" strokeDasharray="4 4" />
              <text x="305" y="75" fontSize="11" fontWeight="bold" fill="#1565C0">BAY B • DAP / SSP</text>

              {/* Bay C */}
              <rect x="530" y="50" width="130" height="220" rx="12" fill="#FFF3E0" fillOpacity="0.4" stroke="#FFB74D" strokeDasharray="4 4" />
              <text x="540" y="75" fontSize="11" fontWeight="bold" fill="#E65100">BAY C • NPK/MOP</text>

              {/* Bay D */}
              <rect x="670" y="50" width="130" height="220" rx="12" fill="#F3E5F5" fillOpacity="0.4" stroke="#BA68C8" strokeDasharray="4 4" />
              <text x="680" y="75" fontSize="11" fontWeight="bold" fill="#7B1FA2">BAY D • BIO/MIC</text>

              {/* Bay E (Pesticide Cage - Protected Border) */}
              <rect x="810" y="50" width="150" height="220" rx="12" fill="#FFEBEE" fillOpacity="0.5" stroke="#E57373" strokeWidth="2" strokeDasharray="6 3" />
              <text x="820" y="75" fontSize="11" fontWeight="bold" fill="#C62828">BAY E • PESTICIDE CAGE 🔒</text>

              {/* Inwarding & Dispatch Staging Docks */}
              <rect x="20" y="300" width="180" height="70" rx="8" fill="#ECEFF1" stroke="#90A4AE" />
              <text x="35" y="340" fontSize="12" fontWeight="bold" fill="#37474F">INWARDING DOCK</text>

              <rect x="800" y="300" width="180" height="70" rx="8" fill="#ECEFF1" stroke="#90A4AE" />
              <text x="815" y="340" fontSize="12" fontWeight="bold" fill="#37474F">DISPATCH & STAGING</text>

              {/* Picker Route Polyline */}
              {isPickerRouteActive && (
                <g>
                  <path
                    d="M 110 335 L 80 180 L 320 180 L 560 180 L 890 335"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                  {pickerRouteStops.map((stop) => (
                    <g key={stop.step} transform={`translate(${stop.x}, ${stop.y})`}>
                      <circle r="12" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#FFFFFF">
                        {stop.step}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Pallet Racks */}
              {filteredSlots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const statusColor =
                  slot.isQuarantined || slot.status === 'expired'
                    ? '#EF4444'
                    : slot.status === 'warning'
                    ? '#F59E0B'
                    : '#10B981';

                return (
                  <g
                    key={slot.id}
                    transform={`translate(${slot.x}, ${slot.y})`}
                    className="cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {/* Pallet Base */}
                    <rect
                      x="0"
                      y="0"
                      width="70"
                      height="50"
                      rx="6"
                      fill={statusColor}
                      fillOpacity={isSelected ? '0.9' : '0.75'}
                      stroke={isSelected ? '#000000' : statusColor}
                      strokeWidth={isSelected ? '3' : '1.5'}
                    />
                    {/* Rack ID */}
                    <text x="35" y="18" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FFFFFF">
                      {slot.id.split('-').slice(1).join('-')}
                    </text>
                    {/* Bags Count */}
                    <text x="35" y="32" textAnchor="middle" fontSize="8" fontWeight="600" fill="#FFFFFF">
                      {slot.bagsCount} bags
                    </text>
                    {/* Days Remaining Pill */}
                    <text x="35" y="44" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#FFFFFF">
                      {slot.daysRemaining}d left
                    </text>
                    {/* Quarantine Badge */}
                    {slot.isQuarantined && (
                      <circle cx="62" cy="8" r="6" fill="#7F1D1D" stroke="#FFFFFF" strokeWidth="1" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Canvas Footer Legend */}
          <div className="flex flex-wrap items-center justify-between text-xs text-[#6E7B74] mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span> Healthy (&gt;180d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500"></span> Priority FEFO (30-60d)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500"></span> Expired / Quarantined
              </span>
            </div>
            <span>Click any pallet rack to inspect lot, weight & quarantine controls</span>
          </div>
        </div>

        {/* Right Pallet Inspector & Route Action Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {selectedSlot ? (
            <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-xs">
                      {selectedSlot.id}
                    </span>
                    <span className="text-xs font-semibold text-[#6E7B74]">{selectedSlot.bayName}</span>
                  </div>
                  {selectedSlot.isQuarantined && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#E8F0E8] leading-snug">
                    {selectedSlot.itemName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6E7B74]">
                    <span>Batch: <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedSlot.batchNumber}</strong></span>
                    <span>•</span>
                    <span>Aisle {selectedSlot.aisle}, Tier {selectedSlot.tier}</span>
                  </div>
                </div>

                {/* Status Callout */}
                <div className={`mt-4 p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${getStatusColor(selectedSlot.status, selectedSlot.isQuarantined)}`}>
                  {selectedSlot.isQuarantined ? (
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : selectedSlot.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {selectedSlot.isQuarantined
                        ? 'Quarantine Lockdown'
                        : selectedSlot.status === 'warning'
                        ? 'Immediate FEFO Dispatch Required'
                        : 'Shelf Life Certified'}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-90">
                      {selectedSlot.isQuarantined
                        ? 'This lot is restricted from being billed at POS or dispatched.'
                        : selectedSlot.status === 'warning'
                        ? 'Approaching expiry date. First-Expiry-First-Out rule automatically prioritizes this batch.'
                        : 'Stock is in optimal condition with over 6 months before expiry.'}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock on Pallet</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {selectedSlot.bagsCount} Bags
                    </span>
                    <span className="text-[10px] text-slate-500 block">{selectedSlot.weightMt} MT</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry Date</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {selectedSlot.expiryDate}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 block">{selectedSlot.daysRemaining} days left</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggleQuarantine(selectedSlot.id)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                    selectedSlot.isQuarantined
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{selectedSlot.isQuarantined ? 'Release Pallet to Active POS' : 'Quarantine / Lock Pallet'}</span>
                </button>

                <button
                  onClick={() => showToast(`Pallet relocate request queued for ${selectedSlot.id}`, 'info')}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2"
                >
                  <Move className="w-4 h-4" />
                  <span>Relocate Pallet to Another Bay</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#242924] p-8 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow text-center flex flex-col items-center justify-center h-full">
              <Warehouse className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Select any pallet on the map to inspect details</p>
            </div>
          )}

          {/* Turn-by-Turn Picker Sheet (when route active) */}
          {isPickerRouteActive && (
            <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-amber-200 dark:border-amber-900/40 card-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Optimized Pick Route
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  4.2 Mins • 142m
                </span>
              </div>

              <div className="space-y-2.5">
                {pickerRouteStops.map((stop) => (
                  <div key={stop.step} className="flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {stop.step}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{stop.name}</div>
                      <div className="text-[11px] text-slate-500">{stop.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
