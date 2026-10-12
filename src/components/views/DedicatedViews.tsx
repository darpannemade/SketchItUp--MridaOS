import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  IndianRupee,
} from 'lucide-react';
import { SalesAnalytics } from '../SalesAnalytics';
import { InventoryIntelligence } from '../InventoryIntelligence';
import { KhataLedger } from '../KhataLedger';
import { ProcurementSection } from '../ProcurementSection';
import { NurseryCameraAndSensors } from '../NurseryCameraAndSensors';
import { SeasonalIntelligence } from '../SeasonalIntelligence';
import { ComplianceAndActivity } from '../ComplianceAndActivity';
import { UsersDirectoryView } from './UsersDirectoryView';
import { ResetPasswordView } from './ResetPasswordView';
import { GSTReportsView } from './GSTReportsView';
import { NotFoundView } from './NotFoundView';
import { SupplierMasterView } from './SupplierMasterView';
import { DeliveryDispatchView } from './DeliveryDispatchView';
import { TallySyncView } from './TallySyncView';
import { MobileCompanionView } from './MobileCompanionView';
import { GodownDigitalTwinView } from './GodownDigitalTwinView';
import { CropVisionSecurityView } from './CropVisionSecurityView';
import { PredictiveReorderView } from './PredictiveReorderView';

export const DedicatedViews: React.FC = () => {
  const { activeView, setActiveModal } = useApp();

  if (activeView === 'godown_twin') {
    return <GodownDigitalTwinView />;
  }

  if (activeView === 'crop_vision') {
    return <CropVisionSecurityView />;
  }

  if (activeView === 'predictive_reorder') {
    return <PredictiveReorderView />;
  }

  if (activeView === 'reset_password') {
    return <ResetPasswordView />;
  }

  if (activeView === 'users_directory') {
    return <UsersDirectoryView />;
  }

  if (activeView === 'gst_reports') {
    return <GSTReportsView />;
  }

  if (activeView === 'suppliers_master') {
    return <SupplierMasterView />;
  }

  if (activeView === 'delivery_dispatch') {
    return <DeliveryDispatchView />;
  }

  if (activeView === 'tally_sync') {
    return <TallySyncView />;
  }

  if (activeView === 'mobile_ops') {
    return <MobileCompanionView />;
  }

  if (activeView === 'sales_pos') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Counter POS, Subsidized DBT Billing & Invoice Stream
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Generate instant GST bills with PoS/DBT Aadhaar verification, FCO MRP ceiling checks, FEFO batch mapping, and customer Khata
            </p>
          </div>
          <button
            onClick={() => setActiveModal('new_sale')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Counter Sale / Bill</span>
          </button>
        </div>
        <SalesAnalytics />
      </div>
    );
  }

  if (activeView === 'inventory_fefo') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Multi-Godown & FEFO Batch Inventory Control
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Automated First-Expiry-First-Out stock rotation, inter-godown transfers (STN), and expired batch lock
            </p>
          </div>
          <button
            onClick={() => setActiveModal('stock_adjust')}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-black dark:bg-[#2D332D] dark:hover:bg-[#353D35] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Stock Adjustment / Variance</span>
          </button>
        </div>
        <InventoryIntelligence />
      </div>
    );
  }

  if (activeView === 'khata_ledger') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Customer Khata, Farmer Credit & Sub-Dealer Directory
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Track 30/60/90+ day credit aging, credit limit checks, WhatsApp reminders, and Tally receipt settlements
            </p>
          </div>
          <button
            onClick={() => setActiveModal('record_khata')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <IndianRupee className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
        <KhataLedger />
      </div>
    );
  }

  if (activeView === 'procurement') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Supplier Purchase Orders, Owner Approvals & GRN Inwarding
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Direct rate contract issuance, &gt;₹1L owner approval gate, and Goods Receipt Notes (GRN) with batch/expiry capture
            </p>
          </div>
          <button
            onClick={() => setActiveModal('create_po')}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-black dark:bg-[#2D332D] dark:hover:bg-[#353D35] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Supplier PO</span>
          </button>
        </div>
        <ProcurementSection />
      </div>
    );
  }

  if (activeView === 'nursery_care' || activeView === 'nursery_ops') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Greenhouse, Nursery & Polyhouse Control
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              IoT microclimate telemetry, scheduled crop tasks and live visual monitoring
            </p>
          </div>
          <button
            onClick={() => setActiveModal('plant_care')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Care Schedule</span>
          </button>
        </div>
        <NurseryCameraAndSensors />
      </div>
    );
  }

  if (activeView === 'compliance' || activeView === 'compliance_fco') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Statutory Licenses, FCO Stock Register & PoS/DBT Reconciliation
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Fertilizer Control Order (1985) Form N register, iFMS PoS subsidy logs, and 50-bag monthly cap tracker
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E0EAE4] dark:bg-[#1B3A1D] text-[#079455] dark:text-[#4CAF50] font-bold text-xs rounded-full">
              Audit Status: 100% FCO Compliant
            </span>
          </div>
        </div>
        <ComplianceAndActivity />
      </div>
    );
  }

  if (activeView === 'intelligence' || activeView === 'seasonal_forecast') {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#242924] p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] dark:border-[#3D453D] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#E8F0E8]">
              Seasonal Demand & Margin Intelligence
            </h2>
            <p className="text-xs text-[#6E7B74] dark:text-[#8A9A8A]">
              Kharif/Rabi sowing predictive models, agroclimatic advisories & profit matrix
            </p>
          </div>
        </div>
        <SeasonalIntelligence />
      </div>
    );
  }

  return <NotFoundView attemptedRoute={activeView} />;
};
