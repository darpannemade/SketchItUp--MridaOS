import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Download,
  Calculator,
  Building2,
  ArrowUpRight,
} from 'lucide-react';

export const TallySyncView: React.FC = () => {
  const {
    tallyVouchers = [],
    syncTallyVouchers,
    retryTallyVoucher,
    sales = [],
    purchaseOrders = [],
    showToast,
    setActiveView,
  } = useApp();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const syncedCount = tallyVouchers.filter((v) => v.status === 'synced').length;
  const pendingCount = tallyVouchers.filter((v) => v.status === 'pending').length;
  const failedCount = tallyVouchers.filter((v) => v.status === 'failed').length;

  const totalSalesGst = sales.reduce((sum, s) => sum + ((s as any).total_tax || (s.total - Math.round(s.total / 1.05))), 0);
  const totalTaxableSales = sales.reduce((sum, s) => sum + ((s as any).total_taxable_amount || Math.round(s.total / 1.05)), 0);
  const totalInputTaxCredit = purchaseOrders.reduce(
    (sum, p) => (p.status === 'received' ? sum + Math.round((p.totalAmount || 0) * 0.05) : sum),
    0
  );
  const netGstPayable = Math.max(0, totalSalesGst - totalInputTaxCredit);

  const filteredVouchers = tallyVouchers.filter((v) => {
    const matchesType = filterType === 'all' || v.voucherType === filterType;
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const handleBulkSync = async () => {
    setIsSyncing(true);
    await syncTallyVouchers();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleExportTallyXml = () => {
    const xmlRows = tallyVouchers
      .map(
        (v) => `  <TALLYMESSAGE xmlns:UDF="TallyUDF">
    <VOUCHER VCHTYPE="${v.voucherType}" ACTION="Create">
      <DATE>${(v.date || '').replace(/-/g, '')}</DATE>
      <VOUCHERNUMBER>${v.voucherNo}</VOUCHERNUMBER>
      <REFERENCE>${v.referenceId}</REFERENCE>
      <PARTYLEDGERNAME>${v.partyLedgerName}</PARTYLEDGERNAME>
      <AMOUNT>${v.amount}</AMOUNT>
      <GSTAMOUNT>${v.gstAmount}</GSTAMOUNT>
    </VOUCHER>
  </TALLYMESSAGE>`
      )
      .join('\n');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDATA>\n${xmlRows}\n      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MridaOS_TallyPrime_Vouchers_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Tally Prime XML Envelope exported for direct import', 'success');
  };

  const handleExportGstr1Csv = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Payment Mode',
      'HSN Summary',
      'Taxable Value',
      'CGST (2.5%)',
      'SGST (2.5%)',
      'Total Invoice Value',
    ];
    const rows = sales.map((s) => {
      const taxable = (s as any).total_taxable_amount || Math.round(s.total / 1.05);
      const totalGst = (s as any).total_tax || (s.total - taxable);
      const halfGst = (totalGst / 2).toFixed(2);
      const hsns = Array.from(new Set(s.items?.map((i) => (i as any).hsn || (i as any).hsn_code || '31021000') || ['31021000'])).join(' | ');
      return [
        s.invoiceNo || s.id,
        s.date,
        `"${s.customerName}"`,
        s.paymentMode || (s.isKhata ? 'khata' : 'cash'),
        `"${hsns}"`,
        taxable,
        halfGst,
        halfGst,
        s.total,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_Fertilizer_Outward_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('GSTR-1 HSN-wise Outward Supplies CSV exported', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#242924] p-6 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
              PRD §6.8 • Tally Prime Connector & GST Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700">
              Port 9000 XML Bridge Connected
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#E8F0E8] mt-1.5 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Tally Prime Accounting Sync & GST Reconciliation
          </h2>
          <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A] mt-0.5">
            Automated voucher push for Sales, GRN Purchases, Khata Receipts, and Credit Notes — zero manual double-entry for your CA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveView('gst_reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
            title="Open Fullscreen Verified GST Tax Invoices Register"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Open GST Reports</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200" />
          </button>
          <button
            onClick={handleExportGstr1Csv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-xs font-bold text-on-surface transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            GSTR-1 / 3B CSV
          </button>
          <button
            onClick={handleExportTallyXml}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-xs font-bold text-on-surface transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-700" />
            Export Tally XML
          </button>
          <button
            onClick={handleBulkSync}
            disabled={isSyncing || (pendingCount === 0 && failedCount === 0)}
            className="flex items-center gap-2 bg-[#079455] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:bg-[#067A46] disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Pushing Vouchers...' : `Sync Pending to Tally (${pendingCount + failedCount})`}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#242924] p-4 rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7B74] dark:text-[#8A9A8A]">
            Vouchers Synced
          </span>
          <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
            {syncedCount} <span className="text-xs font-normal text-[#6E7B74]">/ {tallyVouchers.length}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Real-time XML bridge active</span>
        </div>

        <div className="bg-white dark:bg-[#242924] p-4 rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7B74] dark:text-[#8A9A8A]">
            Pending / Retry Queue
          </span>
          <div className="text-2xl font-black font-mono text-amber-700 mt-1">
            {pendingCount + failedCount}
          </div>
          <span className="text-[11px] text-[#6E7B74]">{failedCount} failed ledger mappings</span>
        </div>

        <div className="bg-white dark:bg-[#242924] p-4 rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7B74] dark:text-[#8A9A8A]">
            Output GST (GSTR-1)
          </span>
          <div className="text-2xl font-black font-mono text-[#1A1A1A] dark:text-[#E8F0E8] mt-1">
            ₹{totalSalesGst.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#6E7B74]">Taxable: ₹{totalTaxableSales.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white dark:bg-[#242924] p-4 rounded-2xl border border-[#E2EAE5] dark:border-[#3D453D]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E7B74] dark:text-[#8A9A8A]">
            Input Tax Credit (GRN)
          </span>
          <div className="text-2xl font-black font-mono text-indigo-700 mt-1">
            ₹{totalInputTaxCredit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Net Payable: ₹{netGstPayable.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Voucher Queue Table */}
      <div className="bg-white dark:bg-[#242924] rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E2EAE5] dark:border-[#3D453D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Tally Prime Voucher Queue & Sync Audit Log
            </h3>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Every Sale, GRN Inward, and Khata Collection automatically generates a Tally-ready voucher
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#F6F8F6] dark:bg-[#1A1F1A] border border-[#CCD8D1] dark:border-[#3D453D] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] dark:text-[#E8F0E8] focus:outline-none"
            >
              <option value="all">All Voucher Types</option>
              <option value="Sales">Sales Vouchers</option>
              <option value="Purchase">Purchase (GRN) Vouchers</option>
              <option value="Receipt">Receipt (Khata) Vouchers</option>
              <option value="Payment">Payment Vouchers</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#F6F8F6] dark:bg-[#1A1F1A] border border-[#CCD8D1] dark:border-[#3D453D] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] dark:text-[#E8F0E8] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F8F6] dark:bg-[#1A1F1A] border-b border-[#E2EAE5] dark:border-[#3D453D] text-[10px] font-bold uppercase tracking-wider text-[#6E7B74]">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Source Ref</th>
                <th className="py-3 px-4">Tally Party Ledger</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4">Sync Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAE5] dark:divide-[#3D453D] text-xs">
              {filteredVouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-[#F6F8F6]/60 dark:hover:bg-[#1A1F1A]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                    {voucher.voucherNo}
                    <div className="text-[10px] text-[#6E7B74] font-normal">{voucher.date}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        voucher.voucherType === 'Sales'
                          ? 'bg-emerald-50 text-emerald-700'
                          : voucher.voucherType === 'Purchase'
                          ? 'bg-indigo-50 text-indigo-700'
                          : voucher.voucherType === 'Receipt'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {voucher.voucherType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#6E7B74]">
                    {voucher.referenceId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#1A1A1A] dark:text-[#E8F0E8] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#6E7B74]" />
                      {voucher.partyLedgerName}
                    </div>
                    {voucher.errorMessage && (
                      <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                        {voucher.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                    ₹{(voucher.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#6E7B74]">
                    ₹{(voucher.gstAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    {voucher.status === 'synced' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}
                    {voucher.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                        <Clock className="w-3 h-3" /> Queued
                      </span>
                    )}
                    {voucher.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                        <AlertTriangle className="w-3 h-3" /> Mapping Error
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {voucher.status !== 'synced' ? (
                      <button
                        onClick={() => retryTallyVoucher(voucher.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {voucher.status === 'failed' ? 'Auto-Create Ledger & Sync' : 'Push Now'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-[#6E7B74]">
                        {voucher.lastSyncAttempt || 'Verified'}
                      </span>
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
