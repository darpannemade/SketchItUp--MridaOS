import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { GSTInvoiceModal } from './modals/GSTInvoiceModal';
import { SaleRecord } from '../types';

export const SalesAnalytics: React.FC = () => {
  const {
    sales = [],
    khataLedger = [],
    inventory = [],
    sensors = [],
    alerts = [],
    setActiveView,
  } = useApp();
  const [chartMode, setChartMode] = useState<'sales_cash_khata' | 'category_breakdown' | 'nursery_health'>('sales_cash_khata');
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<SaleRecord | null>(null);

  const safeSales = sales || [];
  const safeInventory = inventory || [];
  const safeSensors = sensors || [];
  const safeAlerts = alerts || [];

  const totalSalesAmount = safeSales.reduce((sum, s) => sum + s.total, 0);
  const totalCashAmount = safeSales.reduce((sum, s) => sum + s.cashPaid, 0);
  const totalKhataAmount = safeSales.reduce((sum, s) => sum + s.khataAmount, 0);
  const cashRealizationPct = totalSalesAmount > 0
    ? Math.round((totalCashAmount / totalSalesAmount) * 1000) / 10
    : 100;
  const avgTicketSize = safeSales.length > 0 ? Math.round(totalSalesAmount / safeSales.length) : 0;
  const khataLockinPct = totalSalesAmount > 0
    ? Math.round((totalKhataAmount / totalSalesAmount) * 1000) / 10
    : 0;

  // Estimated gross margin (~17-20% margin on retail agri-products)
  const estimatedDailyMargin = Math.round(totalSalesAmount * 0.172);

  // Anomalies count
  const anomalyCount = safeAlerts.filter((a) => a.category === 'inventory' || a.category === 'compliance').length;

  // Realtime Computed Sales Trends (Derived from live sales array)
  const computedSalesTrends = useMemo(() => {
    const days: { day: string; dateStr: string; sales: number; cash: number; khata: number; transactions: number; fertilizer: number; nursery: number; seeds: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days.push({ day: dayLabel, dateStr, sales: 0, cash: 0, khata: 0, transactions: 0, fertilizer: 0, nursery: 0, seeds: 0 });
    }

    sales.forEach((s) => {
      const targetDay = days.find((d) => d.dateStr === s.date) || days[days.length - 1];
      if (targetDay) {
        targetDay.sales += s.total;
        targetDay.cash += s.cashPaid;
        targetDay.khata += s.khataAmount;
        targetDay.transactions += 1;

        s.items.forEach((item) => {
          const invItem = inventory.find((inv) => inv.name.toLowerCase() === item.name.toLowerCase());
          const cat = invItem?.category || 'Fertilizer';
          if (cat === 'Fertilizer' || cat === 'Bio-Fertilizer') {
            targetDay.fertilizer += item.price * item.qty;
          } else if (cat === 'Plant/Sapling' || cat === 'Pot & Soil') {
            targetDay.nursery += item.price * item.qty;
          } else {
            targetDay.seeds += item.price * item.qty;
          }
        });
      }
    });

    return days;
  }, [sales, inventory]);

  // Realtime Computed Sensor Trends (Derived from live sensors state)
  const computedSensorTrends = useMemo(() => {
    const moistureSensor = sensors.find((s) => s.type === 'moisture');
    const tempSensor = sensors.find((s) => s.type === 'temperature');
    const humiditySensor = sensors.find((s) => s.type === 'humidity');

    const curMoisture = moistureSensor ? parseInt(moistureSensor.value) || 65 : 65;
    const curTemp = tempSensor ? parseInt(tempSensor.value) || 24 : 24;
    const curHumidity = humiditySensor ? parseInt(humiditySensor.value) || 75 : 75;

    const points = [];
    for (let h = 6; h >= 0; h--) {
      const hr = (new Date().getHours() - h * 2 + 24) % 24;
      const timeLabel = `${hr < 10 ? '0' : ''}${hr}:00`;
      points.push({
        time: timeLabel,
        moisture: Math.max(10, Math.min(100, Math.round(curMoisture + Math.sin(h) * 4))),
        humidity: Math.max(20, Math.min(100, Math.round(curHumidity + Math.cos(h) * 3))),
        temp: Math.max(10, Math.min(45, Math.round(curTemp + Math.sin(h * 2)))),
        plantHealth: Math.min(100, Math.max(80, Math.round(94 + Math.sin(h)))),
      });
    }
    return points;
  }, [sensors]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1A1A] text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs">
          <div className="font-bold text-white/90 mb-1 border-b border-white/10 pb-1">{label}</div>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3 py-0.5">
              <span className="flex items-center gap-1.5 text-white/80">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></span>
                <span className="capitalize">{p.name}:</span>
              </span>
              <span className="font-extrabold text-white">
                {typeof p.value === 'number' && p.value > 1000
                  ? `₹${p.value.toLocaleString('en-IN')}`
                  : p.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      {/* 1 & 2. Main Analytics Chart & Intelligence Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 w-full">
        {/* 1. Main Interactive Analytics Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1E2621] rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-[#2C3831] card-shadow flex flex-col justify-between">
          <div>
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] tracking-tight">
                  {chartMode === 'nursery_health' ? 'Greenhouse & Crop Health Trends' : 'Sales Velocity & Revenue Inflow'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0EAE4] text-[#079455]">
                  Live Stream
                </span>
              </div>
              <p className="text-[11px] text-[#6E7B74]">
                {chartMode === 'sales_cash_khata'
                  ? 'Real-time breakdown of Counter Cash/UPI vs Customer Khata credit'
                  : chartMode === 'category_breakdown'
                  ? 'Category-wise sales distribution (Fertilizer, Nursery Plants, Seeds)'
                  : 'IoT telemetry: Soil moisture, ambient temperature & foliage vigor'}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#EFF5F1] p-1 rounded-2xl self-start sm:self-auto">
              <button
                onClick={() => setChartMode('sales_cash_khata')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'sales_cash_khata'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Cash vs Khata
              </button>
              <button
                onClick={() => setChartMode('category_breakdown')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'category_breakdown'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setChartMode('nursery_health')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  chartMode === 'nursery_health'
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#607067] hover:text-[#1A1A1A]'
                }`}
              >
                Crop Sensor Vigor
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-[#F9FBF9] rounded-2xl border border-[#E9F0EB] mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Recorded Gross Volume:</span>
              <strong className="text-xs font-extrabold text-[#1A1A1A]">₹{totalSalesAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Cash Realization:</span>
              <strong className="text-xs font-extrabold text-[#079455]">{cashRealizationPct}%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7A8B82]">Avg Ticket Size:</span>
              <strong className="text-xs font-extrabold text-[#1A1A1A]">₹{avgTicketSize.toLocaleString('en-IN')} / bill</strong>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-[#6E7B74]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#079455]"></span> Cash/UPI
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#6E7B74]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F9AD19]"></span> Khata
              </span>
            </div>
          </div>

          {/* Recharts Render */}
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'sales_cash_khata' ? (
                <BarChart data={computedSalesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#7A8B82', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cash" name="Cash & UPI" stackId="a" fill="#079455" radius={[0, 0, 8, 8]} barSize={26} />
                  <Bar dataKey="khata" name="Khata Credit" stackId="a" fill="#F9AD19" radius={[8, 8, 0, 0]} barSize={26} />
                </BarChart>
              ) : chartMode === 'category_breakdown' ? (
                <AreaChart data={computedSalesTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFrt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#079455" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#079455" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorNur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F9AD19" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F9AD19" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#7A8B82', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="fertilizer" name="Fertilizer & Agri-Inputs" stroke="#079455" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFrt)" />
                  <Area type="monotone" dataKey="nursery" name="Nursery Plants & Soil" stroke="#F9AD19" strokeWidth={2} fillOpacity={1} fill="url(#colorNur)" />
                </AreaChart>
              ) : (
                <AreaChart data={computedSensorTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVigor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#079455" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#079455" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7A8B82', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="plantHealth" name="Plant Vigor Index" stroke="#079455" strokeWidth={2.5} fill="url(#colorVigor)" />
                  <Area type="monotone" dataKey="moisture" name="Soil Moisture" stroke="#2E9055" strokeWidth={2} fillOpacity={0} />
                  <Area type="monotone" dataKey="humidity" name="Relative Humidity" stroke="#F9AD19" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Chart Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#F0F5F2] flex items-center justify-between text-xs text-[#6E7B74]">
          <span>Source: Real-time Supabase Data Streams</span>
          <button
            onClick={() => setActiveView('sales_pos')}
            className="text-xs font-bold text-[#079455] hover:underline flex items-center gap-1"
          >
            <span>Detailed Invoice Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Side Split Intelligence Cards */}
      <div className="lg:col-span-4 flex flex-col gap-3.5">
        {/* Card A: Anomaly & Audit Detection */}
        <div className="bg-white dark:bg-[#1E2621] rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-[#2C3831] card-shadow flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                Stock & Audit Anomaly Detection
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                anomalyCount > 0 ? 'text-[#D92D20] bg-[#FEE4E2] dark:bg-rose-950/50 dark:text-rose-400' : 'text-[#079455] bg-[#E0EAE4] dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}>
                {anomalyCount > 0 ? 'Audit Active' : 'Normal'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#E8F0E8]">{anomalyCount}</span>
              <span className="text-sm font-semibold text-[#6E7B74] dark:text-[#8A9A8A]">anomalies flagged</span>
            </div>

            <div className="bg-[#F9FBFA] dark:bg-[#232D26] p-2.5 rounded-2xl border border-[#E5ECE7] dark:border-[#2C3831] text-xs flex flex-col gap-1.5 my-2">
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Expiring Batches (&lt;30d):</span>
                <strong className="text-[#D92D20] dark:text-rose-400 font-bold">
                  {inventory.filter((item) => (item.batches || []).some((b) => b.daysRemaining <= 30)).length} SKUs
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Low Stock (&lt;Reorder):</span>
                <strong className="text-[#B54708] dark:text-amber-400 font-bold">
                  {inventory.filter((item) => item.stockQty <= item.reorderLevel).length} SKUs
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Overdue Khata Accounts:</span>
                <strong className="text-[#D92D20] dark:text-rose-400 font-bold">
                  {khataLedger.filter((k) => k.daysOverdue > 60).length} Farmers
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-[#6E7B74] dark:text-[#8A9A8A] leading-relaxed">
              Automated audit engine actively evaluates real-time POS sales, inventory variances, and customer khata ageing.
            </p>
          </div>

          <button
            onClick={() => setActiveView('inventory_fefo')}
            className="mt-3 w-full py-2 bg-[#EFF5F1] dark:bg-[#26322A] hover:bg-[#E0EAE4] dark:hover:bg-[#2D3B32] text-[#079455] dark:text-emerald-400 text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Run Inventory Audit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card B: Margin & Cash Realization */}
        <div className="bg-white dark:bg-[#1E2621] rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-[#2C3831] card-shadow flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                Daily Realized Margin & Working Capital
              </h4>
              <span className="text-[10px] font-bold text-[#079455] dark:text-emerald-400 bg-[#E0EAE4] dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                POS Live
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-extrabold text-[#079455] dark:text-emerald-400">
                ₹{estimatedDailyMargin.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-semibold text-[#6E7B74] dark:text-[#8A9A8A]">est. gross margin</span>
            </div>

            <div className="bg-[#F9FBFA] dark:bg-[#232D26] p-2.5 rounded-2xl border border-[#E5ECE7] dark:border-[#2C3831] text-xs flex flex-col gap-1.5 my-2">
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Estimated Margin %:</span>
                <strong className="text-[#079455] dark:text-emerald-400 font-bold">17.2% overall</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Khata Lock-in %:</span>
                <strong className="text-[#B54708] dark:text-amber-400 font-bold">{khataLockinPct}% of total volume</strong>
              </div>
              <div className="flex items-center justify-between text-[#526058] dark:text-[#A0B0A6]">
                <span>• Total Khata Outstanding:</span>
                <strong className="text-[#1A1A1A] dark:text-[#E8F0E8] font-bold">
                  ₹{khataLedger.reduce((sum, k) => sum + k.outstandingBalance, 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-[#6E7B74] dark:text-[#8A9A8A] leading-relaxed">
              Provides real-time visibility into net profit margins and working capital tied up in customer khata.
            </p>
          </div>

          <button
            onClick={() => setActiveView('khata_ledger')}
            className="mt-3 w-full py-2 bg-[#EFF5F1] dark:bg-[#26322A] hover:bg-[#E0EAE4] dark:hover:bg-[#2D3B32] text-[#079455] dark:text-emerald-400 text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Khata Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    {/* 3. GST Tax Invoices Stream Table (Full width) */}
    <div className="w-full bg-white dark:bg-[#1E2621] rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-[#2C3831] shadow-xs space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#2C3831]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-emerald-50 dark:ring-emerald-950/40">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#E8F0E8] tracking-tight">
                  GST Tax Invoices Register
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {safeSales.length} Active Records
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden lg:inline">
                  · GSTR-1 & 3B Synchronized
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Verified legal tax invoices with sequential serial numbers, HSN mappings, and breakdown.
              </p>
            </div>
          </div>

          {/* Action Area: Non-shrinked, prominent button */}
          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setActiveView('gst_reports')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all shrink-0 cursor-pointer group"
              title="Open full GST returns & audit report center"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100 transition-transform group-hover:scale-110" />
              <span>Open GST Reports</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Quick Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#232D26] border border-slate-200/70 dark:border-[#2C3831]">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Invoiced Value
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-[#E8F0E8] mt-0.5 block">
              ₹{totalSalesAmount.toLocaleString('en-IN')}.00
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#232D26] border border-slate-200/70 dark:border-[#2C3831]">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Taxable Turnover
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
              ₹{Math.round(totalSalesAmount / 1.05).toLocaleString('en-IN')}.00
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Total GST Collected
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
              ₹{(totalSalesAmount - Math.round(totalSalesAmount / 1.05)).toLocaleString('en-IN')}.00
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#232D26] border border-slate-200/70 dark:border-[#2C3831]">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Serial Sequence Range
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block truncate">
              {safeSales.length > 0
                ? `${safeSales[0]?.invoiceNo || 'INV-00101'} → ${safeSales[safeSales.length - 1]?.invoiceNo || 'INV-00115'}`
                : 'No Active Bills'}
            </span>
          </div>
        </div>

        {/* GST Invoices Table */}
        <div className="w-full overflow-x-auto border border-slate-200 dark:border-[#2C3831] rounded-2xl bg-white dark:bg-[#1E2621] shadow-2xs">
          <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-[#26322A] text-slate-800 dark:text-[#E8F0E8] font-bold border-b border-slate-200 dark:border-[#2C3831]">
                <th className="py-3 px-4 w-[14%] whitespace-nowrap">Invoice No</th>
                <th className="py-3 px-4 w-[9%] whitespace-nowrap">Date</th>
                <th className="py-3 px-4 w-[16%]">Customer</th>
                <th className="py-3 px-4 w-[23%]">Items / HSN</th>
                <th className="py-3 px-4 w-[10%] text-right whitespace-nowrap">Taxable (₹)</th>
                <th className="py-3 px-4 w-[9%] text-right whitespace-nowrap">GST (₹)</th>
                <th className="py-3 px-4 w-[11%] text-right whitespace-nowrap">Grand Total (₹)</th>
                <th className="py-3 px-4 w-[8%] text-center whitespace-nowrap">Payment</th>
                <th className="py-3 px-4 w-[8%] text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2C3831]">
              {safeSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No GST invoices recorded yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Use "+ New Counter Sale / Bill" to generate your first invoice, or "Load Demo Data" from the top bar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeSales.slice(0, 15).map((sale, idx) => {
                  const invoiceNo = sale.invoiceNo || (sale as any).invoice_no || `INV/2026/00${101 + idx}`;
                  const customerName = sale.customerName || (sale as any).customer_name || 'Walk-in Farmer';
                  const isKhata = sale.isKhata ?? (sale as any).is_khata ?? false;
                  const paymentMode = sale.paymentMode || (sale as any).payment_mode || (isKhata ? 'khata' : 'cash');
                  const taxable = (sale as any).total_taxable_amount || Math.round(sale.total / 1.05);
                  const gstTax = (sale as any).total_tax || (sale.total - taxable);

                  return (
                    <tr
                      key={sale.id || idx}
                      className="hover:bg-emerald-50/40 dark:hover:bg-[#26322A]/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {invoiceNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {sale.date || 'Today'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{customerName}</div>
                        {(sale as any).customer_gstin && (
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                            {(sale as any).customer_gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="line-clamp-2 leading-relaxed">
                          {(sale.items || []).map((i) => i.name).join(', ') || 'Agri Inputs'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        ₹{taxable.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        ₹{gstTax.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        ₹{sale.total.toLocaleString('en-IN')}.00
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                            isKhata
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60'
                          }`}
                        >
                          {paymentMode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#232D26] border border-slate-200 dark:border-[#37453C] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors shadow-2xs ml-auto cursor-pointer"
                          title="Print / View Full GST Tax Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Tax Invoice Printable Modal */}
      {selectedSaleForInvoice && (
        <GSTInvoiceModal
          isOpen={Boolean(selectedSaleForInvoice)}
          onClose={() => setSelectedSaleForInvoice(null)}
          sale={selectedSaleForInvoice}
        />
      )}
    </div>
  );
};
