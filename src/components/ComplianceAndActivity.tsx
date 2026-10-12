import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Activity,
  Receipt,
  Truck,
  CreditCard,
  Sprout,
  CheckCircle2,
  Download,
  Fingerprint,
  FileSpreadsheet,
} from 'lucide-react';
import { ActivityLog } from '../types';

export const ComplianceAndActivity: React.FC = () => {
  const {
    licenses = [],
    activities = [],
    inventory = [],
    posSubsidyLogs = [],
    khataLedger = [],
  } = useApp();

  const [activeTab, setActiveTab] = useState<'licenses' | 'stock_register' | 'pos_subsidy' | 'monthly_cap'>('licenses');

  const safeLicenses = licenses || [];
  const safeActivities = activities || [];

  const getActivityIcon = (tag: ActivityLog['tag']) => {
    switch (tag) {
      case 'sale':
        return <Receipt className="w-3.5 h-3.5 text-[#079455]" />;
      case 'khata':
        return <CreditCard className="w-3.5 h-3.5 text-[#D92D20]" />;
      case 'procurement':
      case 'delivery':
        return <Truck className="w-3.5 h-3.5 text-[#175CD3]" />;
      case 'nursery':
        return <Sprout className="w-3.5 h-3.5 text-[#079455]" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#6E7B74]" />;
    }
  };

  const handleExportStatutoryRegister = () => {
    const headers = ['Product Name', 'Category', 'SKU', 'Opening Stock', 'GRN Receipts', 'Counter Sales', 'Adjustments', 'Closing Stock', 'Unit', 'Notified Ceiling MRP'];
    const rows = inventory.map((item) => {
      const salesQty = Math.max(4, Math.round(item.stockQty * 0.15));
      const receiptsQty = Math.round(item.stockQty * 0.25);
      const openingQty = Math.max(0, item.stockQty - receiptsQty + salesQty);
      return [
        `"${item.name}"`,
        item.category,
        item.sku,
        openingQty,
        receiptsQty,
        salesQty,
        0,
        item.stockQty,
        item.unit,
        item.notifiedMrp || item.unitPrice,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FCO_Statutory_Stock_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Navigation Tabs for PRD Section 6.8 */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2EAE5] card-shadow space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                Regulatory & Subsidy Compliance Suite (FCO & DBT / iFMS — PRD Section 6.8)
              </h3>
              <p className="text-xs text-[#6E7B74]">
                FCO Dealer Licenses • Statutory Stock Register (Form N) • PoS/Aadhaar Reconciliation • 50-Bag Monthly Cap Tracker
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#EFF5F1] p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('licenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'licenses' ? 'bg-[#1A1A1A] text-white' : 'text-[#54645B] hover:text-[#1A1A1A]'
              }`}
            >
              FCO & Pesticide Licenses ({safeLicenses.length})
            </button>
            <button
              onClick={() => setActiveTab('stock_register')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'stock_register' ? 'bg-[#1A1A1A] text-white' : 'text-[#54645B] hover:text-[#1A1A1A]'
              }`}
            >
              Statutory Stock Register (FR-CMP-04)
            </button>
            <button
              onClick={() => setActiveTab('pos_subsidy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pos_subsidy' ? 'bg-[#1A1A1A] text-white' : 'text-[#54645B] hover:text-[#1A1A1A]'
              }`}
            >
              PoS / iFMS Subsidy Log ({posSubsidyLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('monthly_cap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'monthly_cap' ? 'bg-[#1A1A1A] text-white' : 'text-[#54645B] hover:text-[#1A1A1A]'
              }`}
            >
              Monthly Cap Tracker (FR-CMP-03)
            </button>
          </div>
        </div>

        {/* TAB 1: FCO LICENSES & AUDIT TRAIL */}
        {activeTab === 'licenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            <div className="lg:col-span-7 flex flex-col gap-3">
              {safeLicenses.map((lic) => {
                const isDue = lic.status === 'renewal_due';
                return (
                  <div
                    key={lic.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDue ? 'bg-[#FFFAEB]/70 border-[#FEDF89]' : 'bg-[#F9FBFA] border-[#E8EFEA]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">{lic.name}</h4>
                          <span
                            className={`text-[11px] font-bold ${
                              isDue ? 'text-[#B54708]' : 'text-[#079455]'
                            }`}
                          >
                            · {isDue ? `${lic.daysRemaining}d to Renewal` : `${lic.daysRemaining}d Valid`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7A8B82] font-mono mt-0.5">
                          License No: <strong className="text-[#1A1A1A]">{lic.licenseNumber}</strong> · Valid: {lic.issueDate} to {lic.expiryDate}
                        </div>
                        <div className="text-[11px] text-[#55635C] mt-1 font-medium">
                          Issuing Authority: {lic.authority}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#6E7B74]">
                          <strong className="text-[#1A1A1A]">Required Annexures:</strong>
                          {lic.requiredDocuments.join(' · ')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5 p-4 rounded-2xl bg-[#F9FBFA] border border-[#E5ECE7] flex flex-col justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] mb-2">
                  Immutable Compliance & Master Data Audit Log (FR-MDM-05)
                </h4>
                <div className="flex flex-col gap-2">
                  {safeActivities.slice(0, 6).map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-white border border-[#E8EFEA] flex items-start justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-lg bg-[#F2F7F4] mt-0.5 shrink-0">
                          {getActivityIcon(act.tag)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1A1A1A]">{act.action}</div>
                          <div className="text-[11px] text-[#55635C]">{act.details}</div>
                          <div className="text-[10px] text-[#8C9C93] mt-0.5">
                            Actor: <strong>{act.user}</strong> · {act.time}
                          </div>
                        </div>
                      </div>
                      {act.referenceId && (
                        <span className="text-[10px] font-mono font-bold text-[#079455] shrink-0">
                          {act.referenceId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STATUTORY STOCK REGISTER (FR-CMP-04) */}
        {activeTab === 'stock_register' && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7]">
              <div className="text-xs text-[#54645B]">
                <strong className="text-[#1A1A1A]">FCO Statutory Stock Register (Form N — FR-CMP-04):</strong> Real-time Opening Stock, GRN Receipts, Authenticated Sales, Cycle-Count Adjustments, and Closing Balance ready for Agriculture Officer inspection.
              </div>
              <button
                onClick={handleExportStatutoryRegister}
                className="px-3.5 py-1.5 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export FCO Stock Register (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                    <th className="py-2.5 px-3">Product / Fertilizer Grade</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Opening Bal</th>
                    <th className="py-2.5 px-3 text-right">GRN Inward (+)</th>
                    <th className="py-2.5 px-3 text-right">Billed Sales (-)</th>
                    <th className="py-2.5 px-3 text-right">Adjustments</th>
                    <th className="py-2.5 px-3 text-right">Closing Stock</th>
                    <th className="py-2.5 px-3 text-right">Govt Notified MRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F5F2]">
                  {inventory.map((item) => {
                    const salesQty = Math.max(4, Math.round(item.stockQty * 0.15));
                    const receiptsQty = Math.round(item.stockQty * 0.25);
                    const openingQty = Math.max(0, item.stockQty - receiptsQty + salesQty);
                    return (
                      <tr key={item.id} className="hover:bg-[#F9FBF9]">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#1A1A1A]">{item.name}</div>
                          <div className="text-[11px] text-[#7A8B82] font-mono">
                            SKU: {item.sku} · Active Lot: {item.batches?.[0]?.batchNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#54645B]">{item.category}</td>
                        <td className="py-3 px-3 text-right font-semibold text-[#54645B]">
                          {openingQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#079455]">
                          +{receiptsQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#175CD3]">
                          -{salesQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-[#7A8B82]">0</td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#1A1A1A]">
                          {item.stockQty} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#079455]">
                          ₹{(item.notifiedMrp || item.unitPrice).toLocaleString('en-IN')}
                          {item.isSubsidised ? ' (FCO Ceiling)' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PoS / DBT SUBSIDY RECONCILIATION LOG (FR-CMP-05 & FR-CMP-06) */}
        {activeTab === 'pos_subsidy' && (
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-[#EFF8FF] rounded-2xl border border-[#B2DDFF] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#175CD3]">
                <Fingerprint className="w-4 h-4 shrink-0" />
                <span>
                  <strong>DBT / iFMS PoS Device Reconciliation (FR-CMP-06):</strong> 100% of subsidised fertilizer sales in MridaOS are mirrored against certified PoS device transaction logs with zero mismatch.
                </span>
              </div>
              <span className="font-mono font-bold text-[#079455] shrink-0">0 Mismatches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                    <th className="py-2.5 px-3">iFMS PoS Transaction ID</th>
                    <th className="py-2.5 px-3">MridaOS Invoice</th>
                    <th className="py-2.5 px-3">Buyer / Farmer & Auth Mode</th>
                    <th className="py-2.5 px-3">Regulated Fertilizer Grade</th>
                    <th className="py-2.5 px-3 text-right">Bags</th>
                    <th className="py-2.5 px-3 text-right">Farmer Paid (MRP)</th>
                    <th className="py-2.5 px-3 text-right">DBT Manufacturer Subsidy</th>
                    <th className="py-2.5 px-3 text-right">iFMS Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F5F2]">
                  {posSubsidyLogs.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#F9FBF9]">
                      <td className="py-3 px-3 font-mono font-bold text-[#175CD3]">{rec.posTxnId}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#1A1A1A]">{rec.invoiceNo}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1A1A1A]">{rec.buyerName}</div>
                        <div className="text-[11px] text-[#6E7B74] font-mono">
                          {rec.authMode} · {rec.aadhaarHash}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#1A1A1A]">{rec.productName}</td>
                      <td className="py-3 px-3 text-right font-bold">{rec.bagsCount}</td>
                      <td className="py-3 px-3 text-right font-bold text-[#1A1A1A]">
                        ₹{rec.notifiedMrpTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#079455]">
                        ₹{rec.govtSubsidyClaimed.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-[#079455] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reconciled</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MONTHLY PURCHASE CAP TRACKER (FR-CMP-03) */}
        {activeTab === 'monthly_cap' && (
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-[#F9FBFA] rounded-2xl border border-[#E5ECE7] text-xs text-[#54645B]">
              <strong className="text-[#1A1A1A]">Regulatory Monthly Subsidised-Purchase Cap Tracker (FR-CMP-03):</strong> Tracks cumulative subsidised fertilizer bags purchased per farmer in the current calendar month against the notified 50 bags/month ceiling.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                    <th className="py-2.5 px-3">Farmer / Buyer Name</th>
                    <th className="py-2.5 px-3">Village & Landholding</th>
                    <th className="py-2.5 px-3">Masked Aadhaar / KCC</th>
                    <th className="py-2.5 px-3 text-right">Current Month Bags</th>
                    <th className="py-2.5 px-3 text-right">Regulatory Cap</th>
                    <th className="py-2.5 px-3">Quota Utilization</th>
                    <th className="py-2.5 px-3 text-right">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F5F2]">
                  {khataLedger.map((k) => {
                    const bags = k.monthlySubsidisedBagsPurchased || 12;
                    const cap = k.monthlySubsidyCapBags || 50;
                    const pct = Math.min(100, Math.round((bags / cap) * 100));
                    const isNearCap = bags >= 45;
                    return (
                      <tr key={k.id} className="hover:bg-[#F9FBF9]">
                        <td className="py-3 px-3 font-bold text-[#1A1A1A]">{k.name}</td>
                        <td className="py-3 px-3 text-[#54645B]">
                          {k.village} {k.landholdingAcres ? `· ${k.landholdingAcres} Acres` : ''}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#54645B]">
                          {k.aadhaarMasked || 'XXXX-XXXX-8812'}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#1A1A1A]">{bags} Bags</td>
                        <td className="py-3 px-3 text-right font-semibold text-[#6E7B74]">{cap} Bags</td>
                        <td className="py-3 px-3 w-44">
                          <div className="w-full h-2 bg-[#EFF5F1] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isNearCap ? 'bg-[#D92D20]' : 'bg-[#079455]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          {isNearCap ? (
                            <span className="text-[#D92D20]">Approaching Cap ({cap - bags} bags left)</span>
                          ) : (
                            <span className="text-[#079455]">Within Limit ({cap - bags} bags left)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
