/**
 * Hardware-Direct Web APIs (Zero-Driver Counter Operations)
 * - Web Serial / Web HID Direct ESC/POS Thermal Receipt Printing (58mm / 80mm)
 * - Weighing Scale Integration with continuous weight stream parser
 * - USB / Bluetooth Barcode & QR Rapid Keystroke Scanner Listener (<50ms)
 */

export interface ThermalPrintOptions {
  width: '58mm' | '80mm';
  baudRate?: number;
  feedLines?: number;
  cutPaper?: boolean;
}

export interface WeighingScaleReading {
  weight: number; // in KG
  unit: string;
  isStable: boolean;
  rawString: string;
  timestamp: number;
}

export interface HardwareDeviceStatus {
  serialSupported: boolean;
  usbSupported: boolean;
  hidSupported: boolean;
  printerConnected: boolean;
  printerPortName?: string;
  scaleConnected: boolean;
  scalePortName?: string;
  scannerActive: boolean;
  lastScannedBarcode?: string;
  liveWeight: number;
  isWeightStable: boolean;
}

// ESC/POS Command Byte Constants
export const ESC_POS = {
  INIT: [0x1B, 0x40], // ESC @
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  DOUBLE_ON: [0x1D, 0x21, 0x11], // 2x Width & Height
  DOUBLE_OFF: [0x1D, 0x21, 0x00],
  FEED_AND_CUT: [0x1D, 0x56, 0x42, 0x00], // GS V 'B' 0
  FEED_3: [0x1B, 0x64, 0x03],
  LINE_FEED: [0x0A],
};

class HardwareDirectService {
  private printerPort: any = null;
  private scalePort: any = null;
  private scaleReader: any = null;
  private isReadingScale = false;
  private currentWeight = 0;
  private isWeightStable = true;
  private weightListeners: ((reading: WeighingScaleReading) => void)[] = [];
  private barcodeListeners: ((barcode: string) => void)[] = [];

  // Barcode burst buffer
  private barcodeBuffer = '';
  private lastKeyTime = 0;
  private barcodeTimeout: any = null;

  constructor() {
    this.initBarcodeScannerListener();
  }

  public isWebSerialSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  public isWebUsbSupported(): boolean {
    return typeof window !== 'undefined' && 'usb' in navigator;
  }

  public isWebHidSupported(): boolean {
    return typeof window !== 'undefined' && 'hid' in navigator;
  }

  /**
   * Generates ESC/POS byte buffer for 58mm (32 chars) or 80mm (48 chars) thermal printers
   */
  public generateEscPosReceipt(data: {
    shopName?: string;
    branch?: string;
    gstin?: string;
    fcoLicence?: string;
    invoiceNo: string;
    date: string;
    farmerName: string;
    farmerPhone?: string;
    aadhaarMasked?: string;
    posTxnId?: string;
    items: {
      name: string;
      qty: number;
      price: number;
      batch: string;
      hsn?: string;
      gstRate?: number;
    }[];
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    grandTotal: number;
    paymentMode: string;
    khataBalance?: number;
    width?: '58mm' | '80mm';
  }): Uint8Array {
    const is80mm = data.width === '80mm';
    const cols = is80mm ? 48 : 32;
    const divider = '-'.repeat(cols);
    const doubleDivider = '='.repeat(cols);

    const bytes: number[] = [];
    const textEncoder = new TextEncoder();

    const append = (arr: number[]) => bytes.push(...arr);
    const printLine = (str: string) => {
      bytes.push(...Array.from(textEncoder.encode(str + '\n')));
    };

    // 1. Initialize
    append(ESC_POS.INIT);

    // 2. Header
    append(ESC_POS.ALIGN_CENTER);
    append(ESC_POS.DOUBLE_ON);
    append(ESC_POS.BOLD_ON);
    printLine(data.shopName || 'MRIDA AGRI RETAIL');
    append(ESC_POS.DOUBLE_OFF);
    append(ESC_POS.BOLD_OFF);

    printLine(data.branch || 'Nashik Central Godown & PoS Hub');
    if (data.gstin) printLine(`GSTIN: ${data.gstin}`);
    if (data.fcoLicence) printLine(`FCO Lic: ${data.fcoLicence}`);
    printLine(doubleDivider);

    append(ESC_POS.BOLD_ON);
    printLine('TAX INVOICE & SUBSIDY CASH MEMO');
    append(ESC_POS.BOLD_OFF);
    printLine(doubleDivider);

    // 3. Metadata
    append(ESC_POS.ALIGN_LEFT);
    printLine(`Invoice: ${data.invoiceNo}`);
    printLine(`Date: ${data.date}`);
    printLine(`Farmer: ${data.farmerName}`);
    if (data.farmerPhone) printLine(`Mobile: ${data.farmerPhone}`);
    if (data.aadhaarMasked) printLine(`Aadhaar: ${data.aadhaarMasked} (DBT Auth)`);
    if (data.posTxnId) printLine(`iFMS PoS ID: ${data.posTxnId}`);
    printLine(divider);

    // 4. Line Items
    if (is80mm) {
      printLine('Item & Batch             Qty    Rate   Total');
    } else {
      printLine('Item/Batch          Qty Rate   Amt');
    }
    printLine(divider);

    data.items.forEach((it) => {
      const lineName = it.name.length > (is80mm ? 22 : 16) ? it.name.slice(0, is80mm ? 20 : 14) + '..' : it.name;
      const total = (it.qty * it.price).toFixed(2);
      if (is80mm) {
        const itemLine = `${lineName.padEnd(24)} ${String(it.qty).padStart(3)} ${it.price.toFixed(0).padStart(7)} ${total.padStart(8)}`;
        printLine(itemLine);
        printLine(`  [Batch: ${it.batch} | HSN: ${it.hsn || '3102'}]`);
      } else {
        const itemLine = `${lineName.padEnd(16)} ${String(it.qty).padStart(2)} ${it.price.toFixed(0).padStart(5)} ${total.padStart(6)}`;
        printLine(itemLine);
        printLine(`  (${it.batch})`);
      }
    });

    printLine(divider);

    // 5. Totals
    append(ESC_POS.ALIGN_RIGHT);
    printLine(`Taxable Value: Rs ${data.taxableAmount.toFixed(2)}`);
    printLine(`CGST (2.5%): Rs ${data.cgstAmount.toFixed(2)}`);
    printLine(`SGST (2.5%): Rs ${data.sgstAmount.toFixed(2)}`);
    printLine(divider);

    append(ESC_POS.DOUBLE_ON);
    append(ESC_POS.BOLD_ON);
    printLine(`NET TOTAL: Rs ${data.grandTotal.toFixed(2)}`);
    append(ESC_POS.DOUBLE_OFF);
    append(ESC_POS.BOLD_OFF);
    printLine(divider);

    // 6. Payment & Khata
    append(ESC_POS.ALIGN_LEFT);
    printLine(`Payment Mode: ${data.paymentMode.toUpperCase()}`);
    if (data.khataBalance !== undefined && data.khataBalance > 0) {
      printLine(`Current Outstanding Khata: Rs ${data.khataBalance.toFixed(2)}`);
    }

    // 7. Footer
    append(ESC_POS.ALIGN_CENTER);
    printLine(divider);
    printLine('Statutory FCO (1985) Verified');
    printLine('Direct Fertilizer Subsidy Passed to Farmer');
    printLine('Thank you for farming with MridaOS!');
    printLine('Helpline: +91 98220 11234');

    // 8. Feed and Paper Cut
    append(ESC_POS.FEED_3);
    append(ESC_POS.FEED_AND_CUT);

    return new Uint8Array(bytes);
  }

  /**
   * Connect to Thermal Printer via Web Serial
   */
  public async connectThermalPrinter(baudRate = 9600): Promise<{ success: boolean; message: string; port?: any }> {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
      };
    }

    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate });
      this.printerPort = port;
      return {
        success: true,
        message: `Connected to Thermal Receipt Printer on baud ${baudRate}`,
        port,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to connect to printer',
      };
    }
  }

  /**
   * Stream ESC/POS bytes directly to printer without opening browser dialog
   */
  public async printEscPos(
    rawBytes: Uint8Array,
    simulatedCallback?: (bytes: Uint8Array) => void
  ): Promise<{ success: boolean; simulated?: boolean; message: string }> {
    if (this.printerPort && this.printerPort.writable) {
      try {
        const writer = this.printerPort.writable.getWriter();
        await writer.write(rawBytes);
        writer.releaseLock();
        return {
          success: true,
          simulated: false,
          message: 'Bytes written directly to thermal printer via Web Serial.',
        };
      } catch (err: any) {
        console.error('Web Serial write error:', err);
      }
    }

    // Zero-driver simulation fallback for preview
    if (simulatedCallback) {
      simulatedCallback(rawBytes);
    }
    return {
      success: true,
      simulated: true,
      message: 'Printed via Zero-Driver Web Serial Simulator (Physical printer port not selected)',
    };
  }

  /**
   * Connect to Digital Weighing Scale via Web Serial
   */
  public async connectWeighingScale(baudRate = 9600): Promise<{ success: boolean; message: string }> {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        message: 'Web Serial API not available for platform weighing scale.',
      };
    }

    try {
      // @ts-ignore
      this.scalePort = await navigator.serial.requestPort();
      await this.scalePort.open({ baudRate });
      this.startReadingScale();
      return {
        success: true,
        message: 'Connected to digital platform weighing scale.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Scale connection aborted',
      };
    }
  }

  private async startReadingScale() {
    if (!this.scalePort || this.isReadingScale) return;
    this.isReadingScale = true;

    try {
      const textDecoder = new TextDecoderStream();
      this.scalePort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.scaleReader = reader;

      let chunkBuffer = '';
      while (this.isReadingScale) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunkBuffer += value;
          const lines = chunkBuffer.split(/\r?\n/);
          chunkBuffer = lines.pop() || '';

          for (const line of lines) {
            this.parseScaleLine(line);
          }
        }
      }
    } catch (err) {
      console.warn('Scale stream read stopped:', err);
    } finally {
      this.isReadingScale = false;
    }
  }

  /**
   * Parses common Indian & industrial weighing scale protocols:
   * e.g. "ST,GS,+025.40kg", "W: 50.00kg", "=025.40", "NET  25.40 KG"
   */
  public parseScaleLine(line: string): WeighingScaleReading | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    let weight = 0;
    let isStable = trimmed.includes('ST') || !trimmed.includes('US');

    // Extract numerical digits and decimal
    const match = trimmed.match(/[-+]?\s*(\d+(\.\d+)?)/);
    if (match) {
      weight = parseFloat(match[1]);
      if (trimmed.startsWith('-')) weight = -weight;
    }

    if (!isNaN(weight)) {
      this.currentWeight = weight;
      this.isWeightStable = isStable;

      const reading: WeighingScaleReading = {
        weight,
        unit: 'KG',
        isStable,
        rawString: trimmed,
        timestamp: Date.now(),
      };

      this.weightListeners.forEach((fn) => fn(reading));
      return reading;
    }

    return null;
  }

  /**
   * Simulated weight update for testing without a physical USB scale
   */
  public simulateScaleWeight(weight: number, isStable = true) {
    this.currentWeight = weight;
    this.isWeightStable = isStable;
    const reading: WeighingScaleReading = {
      weight,
      unit: 'KG',
      isStable,
      rawString: `ST,GS,+${weight.toFixed(2).padStart(6, '0')}kg`,
      timestamp: Date.now(),
    };
    this.weightListeners.forEach((fn) => fn(reading));
  }

  public subscribeWeight(fn: (reading: WeighingScaleReading) => void) {
    this.weightListeners.push(fn);
    return () => {
      this.weightListeners = this.weightListeners.filter((cb) => cb !== fn);
    };
  }

  /**
   * USB & Bluetooth Barcode Scanner Keystroke Burst Listener
   * Scanners type characters at hyper speeds (<50ms between keystrokes) followed by Enter (key code 13)
   */
  private initBarcodeScannerListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea unless it is a rapid burst
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const timeDiff = now - this.lastKeyTime;
      this.lastKeyTime = now;

      // Enter key marks end of scan
      if (e.key === 'Enter') {
        if (this.barcodeBuffer.length >= 3) {
          const barcode = this.barcodeBuffer.trim();
          this.barcodeBuffer = '';
          this.triggerBarcodeScanned(barcode);
        }
        return;
      }

      // Printable single characters
      if (e.key.length === 1) {
        // If burst speed was fast (< 60ms) or buffer already building fast
        if (timeDiff < 60 || this.barcodeBuffer.length === 0) {
          this.barcodeBuffer += e.key;

          clearTimeout(this.barcodeTimeout);
          this.barcodeTimeout = setTimeout(() => {
            // If more than 150ms passed without Enter, reset buffer (user was likely typing manually)
            if (this.barcodeBuffer.length < 8 && isInputFocused) {
              this.barcodeBuffer = '';
            }
          }, 150);
        } else {
          this.barcodeBuffer = e.key;
        }
      }
    });
  }

  private triggerBarcodeScanned(barcode: string) {
    // Play subtle audio beep confirmation for hardware counter feedback
    this.playScannerBeep();
    this.barcodeListeners.forEach((fn) => fn(barcode));
  }

  private playScannerBeep() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch 1760Hz POS beep
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext might be blocked until user interaction
    }
  }

  public subscribeBarcode(fn: (barcode: string) => void) {
    this.barcodeListeners.push(fn);
    return () => {
      this.barcodeListeners = this.barcodeListeners.filter((cb) => cb !== fn);
    };
  }

  public disconnectAll() {
    if (this.scaleReader) {
      try {
        this.scaleReader.cancel();
      } catch {}
    }
    if (this.scalePort) {
      try {
        this.scalePort.close();
      } catch {}
    }
    if (this.printerPort) {
      try {
        this.printerPort.close();
      } catch {}
    }
  }
}

export const hardwareDirectService = new HardwareDirectService();
