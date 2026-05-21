import React, { useState, useEffect } from 'react';
import { getOrders, saveOrders, getStock, saveStock, Order, StockItem, CartItem } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  Clipboard, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Volume2
} from 'lucide-react';

interface PendingOrderProps {
  onOrderProcessed: () => void;
}

export default function PendingOrder({ onOrderProcessed }: PendingOrderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Track the ID of the strictly active processing order. Only 1 can be processed at once.
  const [activeProcessingOrderId, setActiveProcessingOrderId] = useState<string | null>(null);

  // Modal open triggers
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Load orders and stock
  useEffect(() => {
    const list = getOrders();
    setOrders(list.filter(o => o.status === 'pending'));
    setStock(getStock());

    // Determine if any order has pre-existing inputs to set as active processing order
    const preExistingActive = list.find(o => 
      o.status === 'pending' && 
      o.billingSelections && 
      Object.values(o.billingSelections).some(v => v > 0)
    );
    if (preExistingActive) {
      setActiveProcessingOrderId(preExistingActive.id);
    }
  }, []);

  const pendingOrders = orders;

  // Handle setting a stock removal quantity for an item inside an order
  const updateBillingQty = (orderId: string, itemId: string, itemPrice: number, currentQty: number, maxOrderedQty: number, delta: number) => {
    // 1. Enforce only 1 active order processing!
    if (activeProcessingOrderId && activeProcessingOrderId !== orderId) {
      triggerHaptic('warning');
      alert(`Conflict: Only 1 order can be actively processed at a time! You are currently billing items for ${activeProcessingOrderId}. Clear or complete that order first.`);
      return;
    }

    const matchedStock = stock.find(s => s.id === itemId);
    const warehouseQty = matchedStock ? matchedStock.stockQty : 0;

    // Set as active order
    if (!activeProcessingOrderId) {
      setActiveProcessingOrderId(orderId);
    }

    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const selections = { ...(order.billingSelections || {}) };
    const currentSelection = selections[itemId] || 0;
    const targetSelection = currentSelection + delta;

    // Check bounds
    if (targetSelection < 0) {
      triggerHaptic('warning');
      return; // Can't go below 0
    }

    // If user tries to increase qty more than order qty, give different haptic (different vibrate and sound)!
    if (targetSelection > maxOrderedQty) {
      triggerHaptic('warning'); // Warning buzzer/hard vibe
      alert(`Limit: You cannot bill more than the customer ordered quantity (${maxOrderedQty} items)`);
      return;
    }

    // Check against available physical stock
    if (targetSelection > warehouseQty) {
      triggerHaptic('warning');
      alert(`Warehouse Stock Limit: Only ${warehouseQty} units are available in stock for this item.`);
      return;
    }

    // Success adjust! Standard soft click vibration and beep
    triggerHaptic('adjust');

    selections[itemId] = targetSelection;

    // If all billing quantities for this order are back to 0, free up the active order processing lock
    const hasActiveValues = Object.values(selections).some(v => v > 0);
    
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, billingSelections: selections };
      }
      return o;
    });

    setOrders(updatedOrders);
    
    // Save selections globally
    const allDbOrders = getOrders();
    const updatedDb = allDbOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, billingSelections: selections };
      }
      return o;
    });
    saveOrders(updatedDb);

    if (!hasActiveValues) {
      setActiveProcessingOrderId(null);
    }
  };

  // Helper to clear processing selections for the active order
  const clearActiveProcessing = (orderId: string) => {
    triggerHaptic('warning');
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, billingSelections: {} };
      }
      return o;
    });
    setOrders(updatedOrders);

    const allDbOrders = getOrders();
    const updatedDb = allDbOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, billingSelections: {} };
      }
      return o;
    });
    saveOrders(updatedDb);
    setActiveProcessingOrderId(null);
  };

  // Get active order object if exists
  const activeOrder = orders.find(o => o.id === activeProcessingOrderId);
  
  // Calculate total pieces of currently itemized active billing selections
  const getBillingPcsCount = () => {
    if (!activeOrder || !activeOrder.billingSelections) return 0;
    return Object.values(activeOrder.billingSelections).reduce((sum, v) => sum + v, 0);
  };

  const activePcsCount = getBillingPcsCount();

  // Perform Final Bill Action inside modal
  const finalizeBillingGroup = () => {
    if (!activeOrder) return;
    
    const selections = activeOrder.billingSelections || {};
    const enteredSels = Object.entries(selections).filter(([_, qty]) => qty > 0);

    if (enteredSels.length === 0) {
      alert("No quantities selected to bill!");
      return;
    }

    // 1. Deduct billed items from Stock
    const currentStock = getStock();
    const updatedStock = currentStock.map(stockItem => {
      const billQty = selections[stockItem.id] || 0;
      if (billQty > 0) {
        return {
          ...stockItem,
          stockQty: Math.max(0, stockItem.stockQty - billQty)
        };
      }
      return stockItem;
    });
    saveStock(updatedStock);
    setStock(updatedStock);

    // 2. Adjust Order items: 
    // We update the order status to "ready-for-billing"
    // Keep a copy of what was actually selected to be removed so the bill screen shows it
    const allDbOrders = getOrders();
    const updatedDbOrders = allDbOrders.map(o => {
      if (o.id === activeProcessingOrderId) {
        return {
          ...o,
          status: 'ready-for-billing' as const,
          // Store selections inside the main entry so invoicing can pull from it
        };
      }
      return o;
    });

    saveOrders(updatedDbOrders);
    
    // Success feedback (Upbeat chime and success vibrate)
    triggerHaptic('success');
    
    // Clear lock & close modal
    setShowBillingModal(false);
    setActiveProcessingOrderId(null);

    // Reload UI list
    const remainingPending = updatedDbOrders.filter(o => o.status === 'pending');
    setOrders(remainingPending);
    
    onOrderProcessed();
    alert(`Success: Order ${activeOrder.id} has had ${activePcsCount} pieces removed from stock and is moved to "Ready For Billing" stage!`);
  };

  return (
    <div className="relative" id="pending-orders-container">
      {/* Sound notification guidance banner */}
      <div className="mb-4 flex items-center gap-2 bg-slate-800 border border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-300">
        <Volume2 className="w-4 h-4 text-emerald-400" />
        <span>Auditory responsive feedbacks enabled: custom click pitches adjust quantities, warning sliding notes prevent order overflows.</span>
      </div>

      <div className="grid grid-cols-1 gap-4" id="orders-list">
        {pendingOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-500/80 animate-pulse" />
            <span className="text-slate-400 font-medium">All dispatch orders cleared successfully!</span>
            <span className="text-xs text-slate-500">Go to "New Order Entry" to compose fresh shipments.</span>
          </div>
        ) : (
          pendingOrders.map(order => {
            const isExpanded = expandedOrder === order.id;
            const isProcessingThis = activeProcessingOrderId === order.id;
            const isProcessingOther = !!(activeProcessingOrderId && activeProcessingOrderId !== order.id);
            
            // Calculate item count
            const totalOrderedPcs = order.items.reduce((sum, item) => sum + item.qty, 0);

            return (
              <div 
                key={order.id} 
                className={`transition-all duration-300 rounded-xl border ${
                  isProcessingThis 
                    ? 'border-dashed border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/50' 
                    : isProcessingOther 
                      ? 'border-slate-800/80 bg-slate-900/30 opacity-75' 
                      : 'border-slate-700 bg-slate-800/80 hover:bg-slate-850'
                }`}
                id={`pending-order-box-${order.id}`}
              >
                {/* Header Information */}
                <div className="p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="flex-1 min-w-0" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-100 text-lg">{order.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Dispatch
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-slate-400">
                      <span>Buyer: <strong className="text-slate-200">{order.customerName}</strong></span>
                      <span>Total volume: <strong className="text-slate-300">{totalOrderedPcs} items</strong></span>
                      <span>Est. Worth: <strong className="text-cyan-400">${order.totalAmount}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 justify-end">
                    {/* Active Lock Indirection */}
                    {isProcessingThis && (
                      <div className="flex items-center gap-2 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase font-mono">ACTIVE LOCK</span>
                        <button
                          type="button"
                          onClick={() => clearActiveProcessing(order.id)}
                          className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/20 rounded px-1.5 py-0.5 hover:bg-red-900/50"
                          id={`clear-sel-btn-${order.id}`}
                        >
                          Reset
                        </button>
                      </div>
                    )}
                    
                    {isProcessingOther && (
                      <span className="text-[10px] bg-slate-950/60 border border-slate-800 text-slate-500 rounded-lg px-2.5 py-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <Lock className="w-3.5 h-3.5 text-amber-500/60" />
                        Locked
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="bg-slate-900 border border-slate-700/80 p-2 rounded-lg hover:bg-slate-700 text-slate-300"
                      id={`expand-toggle-${order.id}`}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details / Item Listing & Stock Inputs */}
                {isExpanded && (
                  <div className="border-t border-slate-700/60 bg-slate-950/30 p-4 space-y-3" id={`items-table-${order.id}`}>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requested Line Items</h4>
                      <span className="text-[10px] text-slate-500 font-mono">Verify available inventory below</span>
                    </div>

                    <div className="space-y-3">
                      {order.items.map(item => {
                        const billingQty = (order.billingSelections || {})[item.id] || 0;
                        const match = stock.find(s => s.id === item.id);
                        const whStock = match ? match.stockQty : 0;
                        
                        // Item note highlighted checker
                        const hasNote = !!(item.note && item.note.trim());

                        return (
                          <div 
                            key={item.id} 
                            className={`p-3.5 rounded-xl border transition-all ${
                              hasNote 
                                ? 'note-highlight' // Custom warning tint
                                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                            }`}
                            id={`order-item-${order.id}-${item.id}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200 text-sm">{item.name}</span>
                                  <span className="font-mono text-[9px] bg-slate-800 px-1 py-0.5 rounded text-indigo-300 uppercase tracking-wider">
                                    {item.SKU}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-1">
                                  <span>Customer Request: <strong className="text-slate-300">{item.qty} units</strong></span>
                                  <span>Warehouse Stock: <strong className={whStock < 5 ? "text-red-400" : "text-emerald-400"}>{whStock} units</strong></span>
                                  <span>Total Item Cost: <strong className="text-indigo-400">${item.qty * item.price}</strong></span>
                                </div>

                                {/* NOTES DISPLAY (HIGHLIGHTED ONLY) */}
                                {hasNote && (
                                  <div className="mt-2 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-3 py-2 rounded-lg flex items-start gap-1.5 animate-pulse">
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">Item Note:</span> {item.note}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Stock Removal Quantity Entry Input Block */}
                              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 self-start sm:self-center">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Bill Removal:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateBillingQty(order.id, item.id, item.price, billingQty, item.qty, -1)}
                                    disabled={isProcessingOther}
                                    className={`p-1.5 rounded transition ${
                                      isProcessingOther 
                                        ? 'text-slate-700 cursor-not-allowed' 
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                    }`}
                                    id={`bill-minus-${order.id}-${item.id}`}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  
                                  <span className="w-8 text-center font-mono font-bold text-slate-100 text-sm">
                                    {billingQty}
                                  </span>
                                  
                                  <button
                                    type="button"
                                    onClick={() => updateBillingQty(order.id, item.id, item.price, billingQty, item.qty, 1)}
                                    disabled={isProcessingOther}
                                    className={`p-1.5 rounded transition ${
                                      isProcessingOther 
                                        ? 'text-slate-700 cursor-not-allowed' 
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                    }`}
                                    id={`bill-plus-${order.id}-${item.id}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 
        STICKY FLOATING CHECKOUT PANEL 
        This sticky button will appear at the bottom of the page when there is an active processing order with selected quantities.
        It specifies the exact order and quantity of pieces selected and enables immediate billing through a confirmation modal.
      */}
      {activeProcessingOrderId && activePcsCount > 0 && activeOrder && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-xl bg-indigo-950 border border-indigo-500 rounded-2xl shadow-2xl p-4 flex items-center justify-between backdrop-blur-md sticky-bill-glow transition-all duration-300" id="sticky-billing-rail">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest leading-none">Order in Progress</p>
              <h4 className="font-extrabold text-slate-100 text-sm mt-1 leading-snug">
                Bill <span className="text-indigo-400 font-black">{activePcsCount} pcs</span> for {activeOrder.id}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => clearActiveProcessing(activeOrder.id)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 font-bold bg-slate-900 hover:bg-slate-800 rounded-lg"
              title="Clear all inputs"
              id="clear-active-dock-btn"
            >
              Reset
            </button>
            <button
              onClick={() => {
                triggerHaptic('success');
                setShowBillingModal(true);
              }}
              className="bg-indigo-500 text-slate-950 font-black text-sm px-4 py-2.5 rounded-xl transition hover:bg-indigo-400 cursor-pointer"
              id="sticky-checkout-bill-button"
            >
              Compose Bill
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION REVIEW MODAL */}
      {showBillingModal && activeOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="billing-confirmation-modal">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Title */}
            <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center bg-indigo-950/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-slate-100 text-base">Order Fulfillment Invoice Review ({activeOrder.id})</h3>
              </div>
              <button 
                onClick={() => setShowBillingModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                id="close-confirmation-modal-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">Customer:</span>
                  <p className="font-bold text-slate-200 text-sm">{activeOrder.customerName}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Date Logged:</span>
                  <p className="font-mono text-slate-300 font-semibold">{new Date(activeOrder.date).toLocaleString()}</p>
                </div>
              </div>

              {/* Items in Billing Selections */}
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Itemized Billing Selection Summary</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {activeOrder.items.map(item => {
                    const billQty = (activeOrder.billingSelections || {})[item.id] || 0;
                    if (billQty === 0) return null; // do not list items with 0 qty inputted

                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-sm"
                        id={`modal-item-row-${item.id}`}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="font-bold text-slate-200 block truncate">{item.name}</span>
                          {item.note && (
                            <span className="text-[10px] text-yellow-300 font-medium block truncate">
                              Note: {item.note}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold font-mono px-2 py-1 rounded">
                            {billQty} of {item.qty} pcs
                          </span>
                          <span className="block text-xs text-slate-400 mt-1 font-mono">${billQty * item.price} total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warning/Alert if partial match */}
              {activeOrder.items.some(item => {
                const billQty = (activeOrder.billingSelections || {})[item.id] || 0;
                return billQty > 0 && billQty < item.qty;
              }) && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Partial Billing Alert:</span> Some ordered items are being fulfilled with lower quantities than initially ordered by the customer. Make sure this is intended!
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-4 border-t border-slate-700 flex gap-3 justify-end bg-slate-900/50">
              <button
                onClick={() => setShowBillingModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700"
                id="cancel-modal-btn"
              >
                Go Back
              </button>
              <button
                onClick={finalizeBillingGroup}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer"
                id="confirm-modal-bill-btn"
              >
                <span>Fulfill & Save to ready list</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
