import React from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Boxes,
  BookOpen,
  Truck,
  Sprout,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  LogOut,
  Building2,
  MapPin,
  Calculator,
  Smartphone,
  FileSpreadsheet,
  Warehouse,
  Eye,
  CloudRain,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    currentBranch,
    currentRole,
    showToast,
    canAccess,
    signOut,
    isSidebarExpanded,
    setIsSidebarExpanded,
  } = useApp();

  const allNavItems = [
    { id: 'command_center', label: 'Command Center', icon: LayoutGrid },
    { id: 'sales_pos', label: 'Sales & Subsidized PoS', icon: ShoppingBag },
    { id: 'inventory_fefo', label: 'Godown & FEFO Stock', icon: Boxes },
    { id: 'godown_twin', label: 'Godown Digital Twin & Planogram', icon: Warehouse },
    { id: 'khata_ledger', label: 'Khata & Sub-Dealers', icon: BookOpen },
    { id: 'procurement', label: 'Procurement & GRN', icon: Truck },
    { id: 'predictive_reorder', label: 'Predictive Reorder & Weather', icon: CloudRain },
    { id: 'suppliers_master', label: 'Supplier Master', icon: Building2 },
    { id: 'delivery_dispatch', label: 'Dispatch & e-PoD', icon: MapPin },
    { id: 'tally_sync', label: 'Tally Prime & GST', icon: Calculator },
    { id: 'gst_reports', label: 'GST Tax Invoices Register', icon: FileSpreadsheet },
    { id: 'compliance', label: 'FCO & DBT Compliance', icon: ShieldCheck },
    { id: 'intelligence', label: 'Kharif/Rabi Forecast', icon: TrendingUp },
    { id: 'crop_vision', label: 'AI Crop Vision & CCTV', icon: Eye },
    { id: 'mobile_ops', label: 'Mobile Companion', icon: Smartphone },
    { id: 'nursery_care', label: 'Nursery Operations', icon: Sprout },
  ];

  const visibleNavItems = allNavItems.filter((item) => {
    if (
      [
        'suppliers_master',
        'delivery_dispatch',
        'tally_sync',
        'gst_reports',
        'mobile_ops',
        'compliance',
        'intelligence',
        'godown_twin',
        'crop_vision',
        'predictive_reorder',
      ].includes(item.id)
    ) {
      return true;
    }
    return canAccess(item.id);
  });

  const roleLabels: Record<string, string> = {
    owner: 'Owner / Proprietor',
    counter_staff: 'Sales Counter Staff',
    inventory_manager: 'Godown Manager',
    procurement_user: 'Procurement Officer',
    nursery_care_staff: 'Nursery Care',
    accounts_user: 'Accountant / CA',
    admin: 'System Admin',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarExpanded && (
        <div
          onClick={() => setIsSidebarExpanded(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 lg:z-40 h-full w-64 bg-emerald-950 text-white flex flex-col py-4 px-3.5 border-r border-emerald-900/50 transition-transform duration-200 ease-in-out shrink-0 ${
          isSidebarExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Active Branch & Role Card */}
        <div className="mb-3.5 px-3 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-800/70">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            {currentBranch?.name || 'Nashik Central Main Godown'}
          </div>
          <div className="text-xs font-semibold text-white mt-0.5 flex items-center justify-between">
            <span>{roleLabels[currentRole] || currentRole}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
        </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === item.id ||
            (item.id === 'compliance' && activeView === 'compliance_fco') ||
            (item.id === 'intelligence' && activeView === 'seasonal_forecast') ||
            (item.id === 'nursery_care' && activeView === 'nursery_ops');
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsSidebarExpanded(false);
              }}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-emerald-800/90 text-white font-bold shadow-sm border border-emerald-600/40'
                  : 'text-emerald-100/75 hover:text-white hover:bg-emerald-900/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-300' : ''}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-3 border-t border-emerald-800/40 space-y-1">
        <button
          onClick={() =>
            showToast(
              'FCO Helpdesk & Tally Bridge Support: Call 1800-MRIDA-OS or WhatsApp +91 98200 11223',
              'info'
            )
          }
          className="w-full flex items-center gap-3 py-2 px-3 rounded-xl text-emerald-100/70 hover:text-white hover:bg-emerald-900/40 text-xs transition-all cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>FCO & iFMS Helpdesk</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 py-2 px-3 rounded-xl text-emerald-100/70 hover:text-rose-200 hover:bg-rose-950/40 text-xs transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Session</span>
        </button>
      </div>
    </aside>
    </>
  );
};
