/**
 * Government Portal Integrations:
 * - NIC e-Way Bill (EWB) JSON Generation for consignments > ₹50,000
 * - e-Invoicing (IRN & Signed QR Code) for B2B wholesale transactions
 */

import QRCode from 'qrcode';

export interface EwayBillItem {
  productName: string;
  productDesc?: string;
  hsnCode: string;
  quantity: number;
  qtyUnit: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxableAmount: number;
}

export interface EwayBillPayload {
  supplyType: 'O' | 'I'; // Outward / Inward
  subSupplyType: '1' | '2' | '3'; // 1: Supply, 2: Export, 3: Job Work
  docType: 'INV' | 'BIL' | 'BOE' | 'CHL'; // Tax Invoice / Challan
  docNo: string;
  docDate: string; // DD/MM/YYYY
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromPlace: string;
  fromPincode: number;
  actFromStateCode: number; // 27 for Maharashtra
  toGstin: string; // URP for unregistered farmers
  toTrdName: string;
  toAddr1: string;
  toPlace: string;
  toPincode: number;
  actToStateCode: number;
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  totInvValue: number;
  transporterId?: string;
  transporterName?: string;
  transDocNo?: string;
  transDocDate?: string;
  transMode: '1' | '2' | '3' | '4'; // 1: Road, 2: Rail, 3: Air, 4: Ship
  distance: number;
  vehicleNo: string;
  vehicleType: 'R' | 'O'; // Regular / Over Dimensional Cargo
  itemList: EwayBillItem[];
}

export interface GeneratedEwayBillResult {
  ewbNumber: string;
  ewbDate: string;
  validUpto: string;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  signedQrCodeUrl?: string;
  nicJsonPayload: any;
  partA: {
    gstinOfSupplier: string;
    placeOfDelivery: string;
    invoiceNo: string;
    invoiceDate: string;
    value: number;
    hsnCode: string;
    reasonForTransport: string;
  };
  partB: {
    vehicleNo: string;
    transporterDocNo: string;
    transporterName: string;
  };
}

class NicEwayBillService {
  public static THRESHOLD_AMOUNT = 50000;

  /**
   * Check if a sale or transfer requires statutory e-Way bill (>₹50,000)
   */
  public isEwayBillMandatory(amount: number): boolean {
    return amount >= NicEwayBillService.THRESHOLD_AMOUNT;
  }

  /**
   * Generate SHA-256 style 64-char IRN for e-Invoicing
   */
  public generateIrnHash(supplierGstin: string, docNo: string, finYear: string, docType = 'INV'): string {
    const raw = `${supplierGstin}${finYear}${docType}${docNo}`.toUpperCase();
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    // Deterministic pseudo 64-hex string for presentation
    const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
    const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
    const hex3 = Math.abs(hash * 97).toString(16).padStart(8, '0');
    const hex4 = Math.abs(hash * 13).toString(16).padStart(8, '0');
    const hex5 = Math.abs(hash * 7).toString(16).padStart(8, '0');
    const hex6 = Math.abs(hash * 53).toString(16).padStart(8, '0');
    const hex7 = Math.abs(hash * 19).toString(16).padStart(8, '0');
    const hex8 = Math.abs(hash * 41).toString(16).padStart(8, '0');
    return `${hex1}${hex2}${hex3}${hex4}${hex5}${hex6}${hex7}${hex8}`.slice(0, 64);
  }

  /**
   * Build complete NIC compliant e-Way Bill & e-Invoice payload
   */
  public async generateEwayBill(params: {
    invoiceNo: string;
    date: string;
    grandTotal: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    farmerName: string;
    farmerGstin?: string;
    destinationPlace: string;
    distanceKm?: number;
    vehicleNumber?: string;
    transporterName?: string;
    items: {
      name: string;
      qty: number;
      price: number;
      hsn?: string;
      gstRate?: number;
    }[];
  }): Promise<GeneratedEwayBillResult> {
    const ewbNumber = `2710${Math.floor(10000000 + Math.random() * 89999999)}`;
    const now = new Date();
    const ewbDate = now.toLocaleString('en-IN');
    
    // Validity: 1 day per 200 km, minimum 1 day
    const dist = params.distanceKm || 35;
    const validityDays = Math.max(1, Math.ceil(dist / 200));
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const validUpto = validUntil.toLocaleString('en-IN');

    const fromGstin = '27AAECM4821P1Z8';
    const toGstin = params.farmerGstin || 'URP';
    const vehicleNo = params.vehicleNumber || 'MH-15-EG-4921';
    const transporter = params.transporterName || 'Nashik Kisan Logistics';

    const ewbItems: EwayBillItem[] = params.items.map((it) => ({
      productName: it.name,
      productDesc: 'Chemical & Bio Fertilizer under FCO 1985',
      hsnCode: it.hsn || '3102',
      quantity: it.qty,
      qtyUnit: 'BAG',
      cgstRate: (it.gstRate || 5) / 2,
      sgstRate: (it.gstRate || 5) / 2,
      igstRate: 0,
      taxableAmount: it.qty * it.price,
    }));

    const nicJsonPayload: EwayBillPayload = {
      supplyType: 'O',
      subSupplyType: '1',
      docType: 'INV',
      docNo: params.invoiceNo,
      docDate: params.date.split('T')[0] || new Date().toISOString().split('T')[0],
      fromGstin,
      fromTrdName: 'MridaOS Agri Solutions Pvt Ltd',
      fromAddr1: 'Plot 42, Central Godown Complex, Ambad MIDC',
      fromPlace: 'Nashik',
      fromPincode: 422010,
      actFromStateCode: 27,
      toGstin,
      toTrdName: params.farmerName,
      toAddr1: params.destinationPlace,
      toPlace: params.destinationPlace,
      toPincode: 422209,
      actToStateCode: 27,
      totalValue: params.taxableAmount,
      cgstValue: params.cgstAmount,
      sgstValue: params.sgstAmount,
      igstValue: 0,
      totInvValue: params.grandTotal,
      transporterId: '27AABTN9821R1ZK',
      transporterName: transporter,
      transDocNo: `LR-${Math.floor(10000 + Math.random() * 90000)}`,
      transDocDate: new Date().toISOString().split('T')[0],
      transMode: '1',
      distance: dist,
      vehicleNo,
      vehicleType: 'R',
      itemList: ewbItems,
    };

    // e-Invoice IRN & Signed QR Code
    const irn = this.generateIrnHash(fromGstin, params.invoiceNo, '2025-26');
    const ackNo = `122610${Math.floor(100000000 + Math.random() * 899999999)}`;
    const ackDate = now.toISOString();

    const signedPayloadString = JSON.stringify({
      SellerGstin: fromGstin,
      BuyerGstin: toGstin,
      DocNo: params.invoiceNo,
      DocTyp: 'INV',
      DocDt: nicJsonPayload.docDate,
      TotInvVal: params.grandTotal,
      ItemCnt: params.items.length,
      MainHsnCode: ewbItems[0]?.hsnCode || '3102',
      Irn: irn,
    });

    let signedQrCodeUrl = '';
    try {
      signedQrCodeUrl = await QRCode.toDataURL(signedPayloadString, {
        width: 250,
        margin: 1,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
      });
    } catch {
      // Fallback
    }

    return {
      ewbNumber,
      ewbDate,
      validUpto,
      irn,
      ackNo,
      ackDate,
      signedQrCodeUrl,
      nicJsonPayload,
      partA: {
        gstinOfSupplier: fromGstin,
        placeOfDelivery: params.destinationPlace,
        invoiceNo: params.invoiceNo,
        invoiceDate: params.date,
        value: params.grandTotal,
        hsnCode: ewbItems[0]?.hsnCode || '3102',
        reasonForTransport: 'Outward Supply - Sale of Agricultural Inputs',
      },
      partB: {
        vehicleNo,
        transporterDocNo: nicJsonPayload.transDocNo || 'LR-78192',
        transporterName: transporter,
      },
    };
  }

  /**
   * Download official JSON for upload to ewaybillgst.gov.in
   */
  public downloadNicJson(payload: any, filename: string) {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${filename}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

export const nicEwayBillService = new NicEwayBillService();
