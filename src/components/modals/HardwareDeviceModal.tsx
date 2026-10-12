import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Printer,
  Scale,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Cpu,
  Sliders,
  Settings,
} from 'lucide-react';
import { hardwareDirectService, WeighingScaleReading } from '../../services/hardwareDirectService';

interface HardwareDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareDeviceModal: React.FC<HardwareDeviceModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();

  // Printer State
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>('80mm');
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [printerLog, setPrinterLog] = useState<string>('Ready for direct ESC/POS byte streaming.');

  // Scale State
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [liveWeight, setLiveWeight] = useState<number>(25.4);
  const [isStable, setIsStable] = useState<boolean>(true);
  const [simWeightInput, setSimWeightInput] = useState<number>(25.4);

  // Scanner State
  const [lastScanned, setLastScanned] = useState<string>('NCU-2026-01-BATCH');

  useEffect(() => {
    if (!isOpen) return;

    const unsubWeight = hardwareDirectService.subscribeWeight((reading: WeighingScaleReading) => {
      setLiveWeight(reading.weight);
      setIsStable(reading.isStable);
    });

    const unsubBarcode = hardwareDirectService.subscribeBarcode((barcode: string) => {
      setLastScanned(barcode);
      showToast(`⚡ Barcode Scanned: ${barcode}`, 'info');
    });

    return () => {
      unsubWeight();
      unsubBarcode();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectPrinter = async () => {
    const res = await hardwareDirectService.connectThermalPrinter(baudRate);
    if (res.success) {
      setIsPrinterConnected(true);
      setPrinterLog('Direct Web Serial port opened successfully.');
      showToast(res.message, 'success');
    } else {
      setPrinterLog(`Connection Notice: ${res.message} (Simulator fallback active)`);
      showToast(res.message, 'warning');
    }
  };

  const handleTestPrint = async () => {
    const testBytes = hardwareDirectService.generateEscPosReceipt({
      shopName: 'MRIDA AGRI RETAIL',
      branch: 'Nashik Central Godown POS',
      gstin: '27AAECM4821P1Z8',
      fcoLicence: 'FCO/MH/NSK/2026/04',
      invoiceNo: 'TEST-001',
      date: new Date().toLocaleDateString('en-IN'),
      farmerName: 'Dnyaneshwar Gaikwad',
      items: [
        { name: 'Neem Coated Urea (45kg)', qty: 2, price: 266.5, batch: 'NCU-2026-01', gstRate: 5 },
        { name: 'NPK 10:26:26 (50kg)', qty: 1, price: 1470, batch: 'NPK-2026-04', gstRate: 5 },
      ],
      taxableAmount: 1907.62,
      cgstAmount: 47.69,
      sgstAmount: 47.69,
      grandTotal: 2003.0,
      paymentMode: 'Cash Counter',
      width: printerWidth,
    });

    const res = await hardwareDirectService.printEscPos(testBytes, () => {
      setPrinterLog(`Printed ${testBytes.length} ESC/POS bytes via zero-driver Web Serial simulator.`);
    });
    showToast(res.message, 'success');
  };

  const handleConnectScale = async () => {
    const res = await hardwareDirectService.connectWeighingScale(9600);
    if (res.success) {
      setIsScaleConnected(true);
      showToast('Connected to digital platform weighing scale', 'success');
    } else {
      showToast(res.message, 'warning');
    }
  };

  const handleSimulateWeight = (val: number) => {
    setSimWeightInput(val);
    hardwareDirectService.simulateScaleWeight(val, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#242924] w-full max-w-2xl rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-[#079455]/10 text-[#079455]">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
                Hardware-Direct Web APIs (Zero-Driver Counter Operations)
              </h3>
              <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
                Web Serial ESC/POS thermal printing, live platform weighing scales &amp; rapid burst barcode readers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Thermal Receipt Printer */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                <Printer className="w-4 h-4 text-[#079455]" />
                <span>Direct ESC/POS Thermal Receipt Printer (Web Serial)</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPrinterConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {isPrinterConnected ? 'PORT CONNECTED' : 'READY (SIMULATED)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Paper Width</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPrinterWidth('58mm')}
                    className={`flex-1 py-1.5 rounded-xl font-bold ${
                      printerWidth === '58mm' ? 'bg-[#079455] text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    58mm (2-inch)
                  </button>
                  <button
                    onClick={() => setPrinterWidth('80mm')}
                    className={`flex-1 py-1.5 rounded-xl font-bold ${
                      printerWidth === '80mm' ? 'bg-[#079455] text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    80mm (3-inch)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-full p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                >
                  <option value={9600}>9600 bps</option>
                  <option value={19200}>19200 bps</option>
                  <option value={38400}>38400 bps</option>
                  <option value={115200}>115200 bps</option>
                </select>
              </div>

              <div className="flex items-end gap-1.5">
                <button
                  onClick={handleConnectPrinter}
                  className="flex-1 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-black text-white font-bold text-xs"
                >
                  Select Serial Port
                </button>
                <button
                  onClick={handleTestPrint}
                  className="py-1.5 px-3 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white font-bold text-xs"
                >
                  Test Print
                </button>
              </div>
            </div>

            <div className="mt-2 text-[11px] font-mono text-slate-500 bg-white dark:bg-black/40 p-2 rounded-xl">
              {printerLog}
            </div>
          </div>

          {/* Section 2: Platform Weighing Scale */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                <Scale className="w-4 h-4 text-[#079455]" />
                <span>Digital Platform Weighing Scale (Bio-fertilizers & Loose Seeds)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isStable ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{isStable ? 'STABLE' : 'UNSTABLE'}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="p-3 bg-slate-950 text-emerald-400 font-mono rounded-2xl flex items-baseline gap-2 shrink-0 border border-emerald-950">
                <span className="text-3xl font-black">{liveWeight.toFixed(2)}</span>
                <span className="text-sm font-bold">KG</span>
                <span className="text-[10px] text-emerald-600 uppercase ml-2">[GROSS WT]</span>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Simulate Scale Weight (Tester):</span>
                  <span className="font-mono font-bold">{simWeightInput.toFixed(2)} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={simWeightInput}
                  onChange={(e) => handleSimulateWeight(parseFloat(e.target.value))}
                  className="w-full accent-[#079455]"
                />
                <div className="flex gap-2">
                  {[5, 10, 25, 45, 50].map((kg) => (
                    <button
                      key={kg}
                      onClick={() => handleSimulateWeight(kg)}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg text-[10px] font-bold"
                    >
                      {kg}kg
                    </button>
                  ))}
                  <button
                    onClick={() => handleSimulateWeight(0)}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold ml-auto"
                  >
                    Tare (Zero)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Barcode / QR Rapid Burst Scanner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                <Barcode className="w-4 h-4 text-[#079455]" />
                <span>USB / Bluetooth Barcode &amp; QR Keystroke Scanner</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                LISTENING (&lt;50ms BURST)
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Scanned Code / Batch:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {lastScanned}
                </span>
              </div>

              <div className="flex gap-2">
                {['NCU-2026-01', 'DAP-2026-01', 'COR-2026-05'].map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLastScanned(code);
                      showToast(`Simulated Barcode Scan: ${code}`, 'success');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-mono hover:border-[#079455]"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
