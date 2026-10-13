/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MetricCards } from './components/MetricCards';
import { SalesAnalytics } from './components/SalesAnalytics';
import { InventoryIntelligence } from './components/InventoryIntelligence';
import { KhataLedger } from './components/KhataLedger';
import { ProcurementSection } from './components/ProcurementSection';
import { ComplianceAndActivity } from './components/ComplianceAndActivity';
import { NurseryCameraAndSensors } from './components/NurseryCameraAndSensors';
import { DedicatedViews } from './components/views/DedicatedViews';
import { NotFoundView } from './components/views/NotFoundView';
import { ResetPasswordView } from './components/views/ResetPasswordView';
import { LoginPage } from './components/auth/LoginPage';
// PERF-04 FIX: Lenis removed — smooth scroll library is inappropriate for a billing terminal
// import { useLenis } from './hooks/useLenis';
import { SearchPalette } from './components/SearchPalette';
import { ErrorBoundary } from './components/ErrorBoundary'; // UX-02 FIX

// Interactive Modals
import { NewSaleModal } from './components/modals/NewSaleModal';
import { CreatePOModal } from './components/modals/CreatePOModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { PlantCareModal } from './components/modals/PlantCareModal';
import { StockAdjustModal } from './components/modals/StockAdjustModal';
import { AlertsModal } from './components/modals/AlertsModal';
import { LiveCameraModal } from './components/modals/LiveCameraModal';
import { AddUserModal } from './components/modals/AddUserModal';
import { EditUserModal } from './components/modals/EditUserModal';
import { RemoveUserModal } from './components/modals/RemoveUserModal';
import { DeviceSessionsModal } from './components/modals/DeviceSessionsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { HardwareDeviceModal } from './components/modals/HardwareDeviceModal';
import { VoiceBillModal } from './components/modals/VoiceBillModal';
import { WhatsAppKhataModal } from './components/modals/WhatsAppKhataModal';
import { NicEwayBillModal } from './components/modals/NicEwayBillModal';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    isLoadingAuth,
    activeView,
    activeModal,
    setActiveModal,
    isSearchOpen,
    setIsSearchOpen,
    toast,
    selectedCustomerForWhatsApp,
    selectedSaleForEwayBill,
    setVoiceBillData,
  } = useApp();
  // PERF-04 FIX: useLenis removed — no smooth scroll on billing terminal
  // const { containerRef, contentRef } = useLenis(activeView);

  // Global Spotlight Search Shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F4EDDE] text-[#1A1A1A]">
        <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] text-[#35C56E] flex items-center justify-center shadow-lg mb-4 animate-bounce">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <h2 className="text-xl font-black tracking-tight text-[#1A1A1A]">MridaOS Enterprise</h2>
        <p className="text-xs text-[#6E7B74] mt-1 font-medium">Connecting to Supabase Auth & Secure Database...</p>
        <div className="mt-4 w-32 h-1 bg-[#E0EAE4] rounded-full overflow-hidden">
          <div className="w-full h-full bg-[#079455] origin-left animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (activeView === 'reset_password') {
    return <ResetPasswordView />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  if (activeView === '404') {
    return <NotFoundView attemptedRoute={window.location.pathname} />;
  }

  const isCommandCenter = activeView === 'command_center' || activeView === 'dashboard' || !activeView;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F8F6] dark:bg-[#1A1F1A] text-[#1A1A1A] dark:text-[#E8F0E8] font-sans antialiased selection:bg-[#079455]/20 selection:text-[#079455] transition-colors duration-200">
      {/* Top Header Bar */}
      <ErrorBoundary section="Top Bar">
        <TopBar />
      </ErrorBoundary>

      {/* App Body (Sidebar on left, Main Content on right) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar Navigation */}
        <ErrorBoundary section="Navigation">
          <Sidebar />
        </ErrorBoundary>

        {/* Scrollable Dashboard Viewport */}
        <main
          className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-5 custom-scrollbar"
          aria-label="Main content area"
        >
          <div className="max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-5 pb-12">
            {isCommandCenter ? (
              <>
                {/* UX-02 FIX: Each section wrapped in ErrorBoundary — one section crash can't bring down the whole app */}
                <ErrorBoundary section="Dashboard Metrics">
                  <MetricCards />
                </ErrorBoundary>

                <ErrorBoundary section="Sales Analytics">
                  <SalesAnalytics />
                </ErrorBoundary>

                <ErrorBoundary section="Inventory Intelligence">
                  <InventoryIntelligence />
                </ErrorBoundary>

                <ErrorBoundary section="Khata Ledger">
                  <KhataLedger />
                </ErrorBoundary>

                <ErrorBoundary section="Procurement">
                  <ProcurementSection />
                </ErrorBoundary>

                <ErrorBoundary section="Compliance & Activity">
                  <ComplianceAndActivity />
                </ErrorBoundary>

                <ErrorBoundary section="Nursery & Sensors">
                  <NurseryCameraAndSensors />
                </ErrorBoundary>
              </>
            ) : (
              <ErrorBoundary section="View">
                <DedicatedViews />
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>

      {/* Global Spotlight Search Palette (Cmd+K / Ctrl+K) */}
      <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Active Modal Portals — each wrapped in ErrorBoundary */}
      <ErrorBoundary section="POS Terminal">
        {activeModal === 'new_sale' && <NewSaleModal />}
      </ErrorBoundary>
      {activeModal === 'create_po' && <ErrorBoundary section="Create PO"><CreatePOModal /></ErrorBoundary>}
      {activeModal === 'record_khata' && <ErrorBoundary section="Record Payment"><RecordPaymentModal /></ErrorBoundary>}
      {activeModal === 'plant_care' && <ErrorBoundary section="Plant Care"><PlantCareModal /></ErrorBoundary>}
      {activeModal === 'stock_adjust' && <ErrorBoundary section="Stock Adjustment"><StockAdjustModal /></ErrorBoundary>}
      {activeModal === 'quick_view_alerts' && <ErrorBoundary section="Alerts"><AlertsModal /></ErrorBoundary>}
      {activeModal === 'live_camera' && <ErrorBoundary section="Live Camera"><LiveCameraModal /></ErrorBoundary>}
      {activeModal === 'add_user' && <ErrorBoundary section="Add User"><AddUserModal /></ErrorBoundary>}
      {activeModal === 'edit_user' && <ErrorBoundary section="Edit User"><EditUserModal /></ErrorBoundary>}
      {activeModal === 'remove_user' && <ErrorBoundary section="Remove User"><RemoveUserModal /></ErrorBoundary>}
      {activeModal === 'device_sessions' && <ErrorBoundary section="Device Sessions"><DeviceSessionsModal /></ErrorBoundary>}
      {activeModal === 'change_password' && <ErrorBoundary section="Change Password"><ChangePasswordModal /></ErrorBoundary>}
      {activeModal === 'hardware_devices' && (
        <ErrorBoundary section="Hardware Devices">
          <HardwareDeviceModal isOpen={true} onClose={() => setActiveModal('none')} />
        </ErrorBoundary>
      )}
      {activeModal === 'voice_bill' && (
        <ErrorBoundary section="Voice Billing">
          <VoiceBillModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            onApplyBill={(parsed) => {
              setVoiceBillData(parsed);
              setActiveModal('new_sale');
            }}
          />
        </ErrorBoundary>
      )}
      {activeModal === 'whatsapp_khata' && selectedCustomerForWhatsApp && (
        <ErrorBoundary section="WhatsApp Khata">
          <WhatsAppKhataModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            customer={selectedCustomerForWhatsApp}
          />
        </ErrorBoundary>
      )}
      {activeModal === 'nic_eway_bill' && selectedSaleForEwayBill && (
        <ErrorBoundary section="NIC e-Way Bill">
          <NicEwayBillModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            sale={selectedSaleForEwayBill}
          />
        </ErrorBoundary>
      )}

      {/* Floating Global Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-semibold shadow-2xl border border-zinc-700 animate-slide-up"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
          <span>{toast?.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      {/* UX-02 FIX: Top-level ErrorBoundary catches any error that slips through section boundaries */}
      <ErrorBoundary section="Application">
        <MainLayout />
      </ErrorBoundary>
    </AppProvider>
  );
}
