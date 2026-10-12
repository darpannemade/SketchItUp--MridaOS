import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CloudRain,
  TrendingUp,
  AlertTriangle,
  FileText,
  Building2,
  DollarSign,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

interface WeatherForecastAlert {
  id: string;
  region: string;
  dates: string;
  condition: string;
  rainProbability: number;
  humidity: number;
  threatLevel: 'High' | 'Moderate';
  targetPathogen: string;
  recommendedSkus: {
    skuName: string;
    currentStock: number;
    recommendedOrderQty: number;
    unit: string;
    estimatedCost: number;
    suggestedSupplier: string;
  }[];
}

interface SupplierBenchmark {
  supplierName: string;
  skuName: string;
  unitPrice: number;
  creditDays: number;
  freightSubsidy: string;
  leadTimeDays: number;
  marginPercent: number;
  isRecommended: boolean;
  score: number;
}

const WEATHER_ALERTS: WeatherForecastAlert[] = [
  {
    id: 'IMD-MH-2026-03',
    region: 'Nashik, Niphad & Dindori Grape Belt',
    dates: 'March 14 - March 18, 2026',
    condition: 'Unseasonal Thunderstorms & 92% Relative Humidity',
    rainProbability: 84,
    humidity: 92,
    threatLevel: 'High',
    targetPathogen: 'High risk of Grape Downy Mildew & Citrus Canker outbreaks',
    recommendedSkus: [
      {
        skuName: 'Mancozeb 75% WP Fungicide (1kg)',
        currentStock: 40,
        recommendedOrderQty: 250,
        unit: 'kg',
        estimatedCost: 250 * 420,
        suggestedSupplier: 'Coromandel International Ltd',
      },
      {
        skuName: 'Metalaxyl 8% + Mancozeb 64% WP (500g)',
        currentStock: 15,
        recommendedOrderQty: 180,
        unit: 'packs',
        estimatedCost: 180 * 580,
        suggestedSupplier: 'Mahadhan Agri Solutions',
      },
      {
        skuName: 'Copper Oxychloride 50% WP (500g)',
        currentStock: 8,
        recommendedOrderQty: 120,
        unit: 'packs',
        estimatedCost: 120 * 360,
        suggestedSupplier: 'IPL (Indian Potash Ltd)',
      },
    ],
  },
];

const SUPPLIER_BENCHMARKS: SupplierBenchmark[] = [
  {
    supplierName: 'Coromandel International Ltd',
    skuName: 'Mancozeb 75% WP (1kg)',
    unitPrice: 420,
    creditDays: 30,
    freightSubsidy: '100% Free Doorstep Delivery',
    leadTimeDays: 2,
    marginPercent: 18.5,
    isRecommended: true,
    score: 94,
  },
  {
    supplierName: 'IPL (Indian Potash Ltd)',
    skuName: 'Mancozeb 75% WP (1kg)',
    unitPrice: 435,
    creditDays: 21,
    freightSubsidy: '₹5/bag extra freight',
    leadTimeDays: 4,
    marginPercent: 15.2,
    isRecommended: false,
    score: 81,
  },
  {
    supplierName: 'IFFCO Cooperative Apex',
    skuName: 'Neem Coated Urea (45kg)',
    unitPrice: 242,
    creditDays: 45,
    freightSubsidy: 'Direct Railway Siding Clearance',
    leadTimeDays: 3,
    marginPercent: 12.0,
    isRecommended: true,
    score: 96,
  },
  {
    supplierName: 'Mahadhan (Deepak Fertilisers)',
    skuName: 'NPK 10:26:26 (50kg)',
    unitPrice: 1380,
    creditDays: 30,
    freightSubsidy: 'Ex-Plant Taloja',
    leadTimeDays: 2,
    marginPercent: 16.4,
    isRecommended: true,
    score: 91,
  },
  {
    supplierName: 'RCF (Rashtriya Chemicals)',
    skuName: 'NPK 10:26:26 (50kg)',
    unitPrice: 1410,
    creditDays: 15,
    freightSubsidy: 'Shared Freight',
    leadTimeDays: 5,
    marginPercent: 13.8,
    isRecommended: false,
    score: 79,
  },
];

export const PredictiveReorderView: React.FC = () => {
  const { showToast, setActiveModal, createPurchaseOrder } = useApp();
  const [selectedAlert, setSelectedAlert] = useState(WEATHER_ALERTS[0]);

  const handleDraftAutoPO = (sku: typeof WEATHER_ALERTS[0]['recommendedSkus'][0]) => {
    setActiveModal('create_po');
    showToast(
      `📝 Drafted PO for ${sku.recommendedOrderQty} ${sku.unit} of ${sku.skuName} with ${sku.suggestedSupplier}`,
      'success'
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600">
              <CloudRain className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#E8F0E8] tracking-tight">
              Predictive Reordering & Dynamic Supplier Benchmarks
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              IMD Weather Linked
            </span>
          </div>
          <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
            India Meteorological Department (IMD) rain radar integration automatically triggers emergency fungicide purchase orders before supply shortages strike.
          </p>
        </div>
      </div>

      {/* Weather Triggered Auto-PO Card */}
      <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-sky-200 dark:border-sky-900/50 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-sky-100 dark:border-sky-950 gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
              <CloudRain className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wide">
                  IMD Weather Alert: {selectedAlert.dates}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {selectedAlert.threatLevel} Priority
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedAlert.condition} ({selectedAlert.region})
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div>Rainfall Prob: <strong className="text-sky-600">{selectedAlert.rainProbability}%</strong></div>
            <div>Humidity: <strong className="text-sky-600">{selectedAlert.humidity}%</strong></div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{selectedAlert.targetPathogen} — Immediate fungicide stock fortification recommended!</span>
          </div>

          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
            Automated Draft Purchase Orders Ready for 1-Click Placement:
          </h4>

          <div className="space-y-3">
            {selectedAlert.recommendedSkus.map((sku, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {sku.skuName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Current Godown Stock: <strong className="text-rose-600">{sku.currentStock} {sku.unit} (CRITICAL)</strong> • Recommended Order: <strong className="text-emerald-700 dark:text-emerald-400">{sku.recommendedOrderQty} {sku.unit}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    Optimal Supplier: <strong className="text-slate-800 dark:text-slate-200">{sku.suggestedSupplier}</strong> (Best Margin &amp; Immediate Lead Time)
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Est. ₹{sku.estimatedCost.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => handleDraftAutoPO(sku)}
                    className="px-4 py-2 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>1-Click Draft PO</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supplier Price Benchmarking Matrix */}
      <div className="bg-white dark:bg-[#242924] p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#E8F0E8] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#079455]" />
              <span>Dynamic Supplier Price Benchmarking</span>
            </h3>
            <p className="text-xs text-[#6E7B74] mt-0.5">
              Historical purchase prices, credit terms, freight allowances, and real margins across manufacturers
            </p>
          </div>
          <span className="text-xs font-bold text-[#079455] bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
            AI Vendor Scoring Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Manufacturer / Supplier</th>
                <th className="py-2.5 px-3">Product SKU</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-center">Credit Days</th>
                <th className="py-2.5 px-3">Freight Policy</th>
                <th className="py-2.5 px-3 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-right">Gross Margin</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {SUPPLIER_BENCHMARKS.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.supplierName}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{b.skuName}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{b.unitPrice}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                      {b.creditDays} Days
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-[11px]">{b.freightSubsidy}</td>
                  <td className="py-3 px-3 text-center font-mono">{b.leadTimeDays}d</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 font-mono">
                    {b.marginPercent}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    {b.isRecommended ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ★ Recommended
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Sub-optimal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
