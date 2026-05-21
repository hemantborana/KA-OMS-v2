import React, { useState, useEffect } from 'react';
import { getOrders, saveOrders, Order } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  FileText, 
  Trash2, 
  DollarSign, 
  Calendar, 
  User, 
  CheckSquare, 
  AlertTriangle,
  Download,
  CheckCircle,
  Archive
} from 'lucide-react';

interface ReadyForBillingProps {
  onOrderProcessed: () => void;
}

export default function ReadyForBilling({ onOrderProcessed }: ReadyForBillingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    const list = getOrders();
    setOrders(list.filter(o => o.status === 'ready-for-billing'));
  };

  const handleCompleteBilling = (orderId: string) => {
    // Moves order from ready-for-billing to fully billed (finished)
    const allDbOrders = getOrders();
    const updated = allDbOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'billed' as const };
      }
      return o;
    });
    saveOrders(updated);
    triggerHaptic('success');
    loadOrders();
    onOrderProcessed();
    alert(`Success: Order ${orderId} has been successfully settled and flagged as Billed!`);
  };

  // COMPLETE REMOVAL from Ready for Billing (Per User request 2)
  const confirmDeleteOrder = () => {
    if (!orderToDelete) return;

    const allDbOrders = getOrders();
    // Complete removal (delete order completely from DB)
    const updated = allDbOrders.filter(o => o.id !== orderToDelete);
    saveOrders(updated);
    
    triggerHaptic('warning'); // Warning feedback for deletion

    setOrderToDelete(null);
    loadOrders();
    onOrderProcessed();
    alert(`Order ${orderToDelete} deleted completely from system records.`);
  };

  return (
    <div className="space-y-6" id="ready-billing-container">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-800 p-4 rounded-xl border border-slate-700/60">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            Ready for Billing queue
          </h2>
          <p className="text-xs text-slate-400">Orders fully picked and cleared for immediate customer checkout settling</p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30">
          {orders.length} Active Settlement Orders
        </span>
      </div>

      {/* Main Container list */}
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/50 border border-dashed border-slate-700/60 rounded-2xl flex flex-col items-center justify-center gap-4">
          <Archive className="w-14 h-14 text-slate-600 animate-pulse" />
          <span className="text-slate-400 font-semibold text-base">Billing queue is empty!</span>
          <span className="text-xs text-slate-500">Pick items and fulfill them inside "Pending Dispatch" view to add orders here</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="ready-orders-grid">
          {orders.map(order => {
            const hasSelections = order.billingSelections && Object.keys(order.billingSelections).length > 0;
            return (
              <div 
                key={order.id} 
                className="bg-slate-850 border border-slate-700/60 rounded-xl p-4 shadow-md flex flex-col justify-between"
                id={`ready-order-card-${order.id}`}
              >
                <div>
                  {/* Top order metrics */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        {order.id}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {new Date(order.date).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-bold uppercase tracking-wide">Total Value</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        ${order.totalAmount}
                      </span>
                    </div>
                  </div>

                  {/* Customer Block */}
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300 mb-3">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 block">Deliver To / Customer:</span>
                      <strong className="text-slate-200">{order.customerName}</strong>
                    </div>
                  </div>

                  {/* Itemized list inside the ready group */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Fulfilled Merchandise:</span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                      {order.items.map(item => {
                        const billQty = (order.billingSelections || {})[item.id] ?? item.qty; // show selected, default to ordered
                        if (hasSelections && billQty === 0) return null; // do not list unselected pieces

                        return (
                          <div key={item.id} className="flex justify-between items-center text-xs text-slate-300" id={`ready-item-row-${order.id}-${item.id}`}>
                            <span className="truncate pr-3 flex-1">{item.name} {item.note && <span className="text-yellow-400 uppercase tracking-wider text-[9px] font-bold">(*Note)</span>}</span>
                            <span className="font-mono text-slate-400 text-[11px] shrink-0 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {billQty} units
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer with COMPLETE REMOVAL optional button */}
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-800/80 justify-between">
                  {/* Delete option - complete deletion from system per Request 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('warning');
                      setOrderToDelete(order.id);
                    }}
                    className="p-2 bg-red-950/25 text-red-400 hover:text-red-300 border border-red-900/40 rounded-xl hover:bg-red-900/30 transition flex items-center justify-center gap-1.5 text-xs font-bold"
                    title="Delete permanently from ready queue"
                    id={`delete-ready-order-btn-${order.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Settlement Option */}
                    <button
                      type="button"
                      onClick={() => handleCompleteBilling(order.id)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                      id={`settle-ready-order-btn-${order.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Settle & Close</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (Request 2) */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="ready-delete-modal">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-slate-100 font-extrabold text-base mb-2">Delete Order Permanently?</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Are you absolutely sure you want to completely remove <span className="text-slate-200 font-bold">{orderToDelete}</span> from Ready for Billing queue? This action cannot be undone.
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-700 flex gap-2 justify-stretch">
              <button
                type="button"
                className="flex-1 px-3 py-2 bg-slate-800 text-xs font-semibold rounded-lg text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                onClick={() => setOrderToDelete(null)}
                id="reject-delete-btn"
              >
                No, Keep Order
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-xs font-black rounded-lg text-white transition cursor-pointer"
                onClick={confirmDeleteOrder}
                id="accept-delete-btn"
              >
                Yes, Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
