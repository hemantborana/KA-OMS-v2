import React, { useState, useEffect } from 'react';
import NewOrderEntry from './neworderentry';
import PendingOrder from './pendingorder';
import ReadyForBilling from './readyforbilling';
import StockOverview from './stockoverview';
import StockUpdation from './stockupdation';
import UserManagement from './usermanagement';
import PDFEditor from './pdfeditor';
import { getOrders, getStock, getUsers, User, Order } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  ShoppingCart, 
  Clipboard, 
  CheckSquare, 
  Layers, 
  RefreshCw, 
  Users, 
  FileText,
  Volume2,
  Box,
  Truck,
  DollarSign
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('new');
  
  // Header indicators
  const [pendingCount, setPendingCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [totalStockItems, setTotalStockItems] = useState(0);
  const [activeProfile, setActiveProfile] = useState<User | null>(null);

  useEffect(() => {
    updateHeaderCounts();
    // Default current user to first user from storage if available
    const savedUser = localStorage.getItem('sms_current_user');
    if (savedUser) {
      setActiveProfile(JSON.parse(savedUser));
    } else {
      const list = getUsers();
      if (list.length > 0) {
        setActiveProfile(list[0]);
      }
    }

    // Set up a periodic check for active profile changes
    const interval = setInterval(() => {
      const u = localStorage.getItem('sms_current_user');
      if (u) {
        setActiveProfile(JSON.parse(u));
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const updateHeaderCounts = () => {
    const ordersList = getOrders();
    setPendingCount(ordersList.filter(o => o.status === 'pending').length);
    setReadyCount(ordersList.filter(o => o.status === 'ready-for-billing').length);
    
    const stockList = getStock();
    setTotalStockItems(stockList.reduce((sum, s) => sum + s.stockQty, 0));
  };

  const handleTabChange = (tab: string) => {
    triggerHaptic('adjust');
    setActiveTab(tab);
  };

  // Navigations Config
  const navigationItems = [
    { id: 'new', name: 'New Order Entry', icon: ShoppingCart, count: null, color: 'text-emerald-400' },
    { id: 'pending', name: 'Pending Orders', icon: Clipboard, count: pendingCount, color: 'text-amber-400' },
    { id: 'ready', name: 'Ready for Billing', icon: CheckSquare, count: readyCount, color: 'text-cyan-400' },
    { id: 'overview', name: 'Stock Overview', icon: Layers, count: null, color: 'text-indigo-400' },
    { id: 'updation', name: 'Stock Updation', icon: RefreshCw, count: null, color: 'text-purple-400' },
    { id: 'users', name: 'User Directory', icon: Users, count: null, color: 'text-pink-400' },
    { id: 'pdf', name: 'Invoices (PDF)', icon: FileText, count: null, color: 'text-slate-400' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-900 text-slate-100" id="main-application">
      {/* SIDE NAVIGATION PANEL */}
      <aside className="w-full lg:w-72 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between shrink-0" id="sidebar-rail">
        <div className="p-5 space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="w-5 h-5 text-slate-950 font-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider uppercase text-slate-100 font-sans">
                LOGISTICS HUB
              </h1>
              <span className="text-[10px] text-indigo-400/90 font-mono tracking-widest uppercase">
                BILL & STOCK SUITE
              </span>
            </div>
          </div>

          {/* Navigational Tabs Grid */}
          <nav className="space-y-1.5" id="nav-rail">
            {navigationItems.map(item => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  type="button"
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-semibold transition group ${
                    active 
                      ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  id={`nav-link-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? item.color : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.count !== null && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                      item.id === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* PROFILE BADGE AT SIDEBAR FOOTER */}
        {activeProfile && (
          <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between mx-1 mb-1 rounded-b-xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-bold">
                {activeProfile.username[0].toUpperCase()}
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-300 block leading-tight">@{activeProfile.username}</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-1 py-0.2 rounded font-mono uppercase tracking-widest">
                  {activeProfile.role}
                </span>
              </div>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-slate-600 animate-pulse" />
          </div>
        )}
      </aside>

      {/* CORE DISPLAY CONTAINER */}
      <main className="flex-1 p-5 lg:p-7 overflow-y-auto flex flex-col justify-between" id="content-container">
        {/* UPPER STATUS STRIP */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-slate-800 pb-4" id="upper-belt">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Operations Pipeline</span>
            <h2 className="text-xl font-bold tracking-tight text-slate-100 mt-0.5">
              {activeTab === 'new' && 'Order Creation Console'}
              {activeTab === 'pending' && 'Fulfill Storage Removal'}
              {activeTab === 'ready' && 'Ready Checklist Settlements'}
              {activeTab === 'overview' && 'Live Storage Inventory'}
              {activeTab === 'updation' && 'Product replenishments'}
              {activeTab === 'users' && 'Staff Permissions Directory'}
              {activeTab === 'pdf' && 'Archived PDF Invoicing'}
            </h2>
          </div>

          {/* MINI LED METRICS STRIP */}
          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5" title="Available units in warehouse">
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              <span>Available stock: <strong className="text-slate-200">{totalStockItems}</strong></span>
            </div>
            <span className="text-slate-800 h-4">|</span>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active queue: <strong className="text-slate-200">{pendingCount + readyCount}</strong></span>
            </div>
          </div>
        </header>

        {/* MODULAR COMPONENT ROUTER */}
        <section className="flex-1" id="tab-renderer">
          {activeTab === 'new' && (
            <NewOrderEntry 
              onOrderAdded={updateHeaderCounts} 
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'pending' && (
            <PendingOrder 
              onOrderProcessed={updateHeaderCounts} 
            />
          )}
          {activeTab === 'ready' && (
            <ReadyForBilling 
              onOrderProcessed={updateHeaderCounts} 
            />
          )}
          {activeTab === 'overview' && (
            <StockOverview />
          )}
          {activeTab === 'updation' && (
            <StockUpdation />
          )}
          {activeTab === 'users' && (
            <UserManagement />
          )}
          {activeTab === 'pdf' && (
            <PDFEditor />
          )}
        </section>
      </main>
    </div>
  );
}
