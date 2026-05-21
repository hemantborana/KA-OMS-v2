import React, { useState, useEffect } from 'react';
import { getOrders, Order } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  Printer, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';

export default function PDFEditor() {
  const [settledOrders, setSettledOrders] = useState<Order[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Order | null>(null);

  useEffect(() => {
    const list = getOrders();
    // Billed status means settled
    const settled = list.filter(o => o.status === 'billed');
    setSettledOrders(settled);
    if (settled.length > 0) {
      setActiveInvoice(settled[0]);
    }
  }, []);

  const selectInvoice = (ord: Order) => {
    triggerHaptic('adjust');
    setActiveInvoice(ord);
  };

  const currentInvoiceNotes = activeInvoice?.items.filter(item => item.note).map(item => ({
    name: item.name,
    note: item.note
  })) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="pdf-editor-panel">
      {/* List of settled/billed orders */}
      <div className="lg:col-span-4 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Closed Accounts
          </h2>
          <p className="text-xs text-slate-400">Archived settlements available for PDF receipt generation</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="settled-invoices-list">
          {settledOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No settled orders found in records. Complete a billing check-out first inside "Ready for Billing".
            </div>
          ) : (
            settledOrders.map(ord => {
              const active = ord.id === activeInvoice?.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => selectInvoice(ord)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    active 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-slate-700/60 bg-slate-900/40 hover:bg-slate-900'
                  }`}
                  id={`invoice-item-${ord.id}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-slate-200 text-sm">{ord.id}</strong>
                    <span className="text-emerald-400 font-bold font-mono text-xs">${ord.totalAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>{ord.customerName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">Settled</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invoice visualizer Sheet */}
      <div className="lg:col-span-8 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col justify-between h-[calc(100vh-140px)] min-h-[500px]">
        {activeInvoice ? (
          <div className="flex flex-col h-full justify-between">
            {/* Header / Actions section */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/60 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-100 text-base">Invoice Preview Sheet</h3>
                <p className="text-xs text-slate-400">Print or export document below</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('success');
                    window.print();
                  }}
                  className="p-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  id="print-btn"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Simulated Receipt paper sheet */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-300 space-y-6" id="receipt-paper">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    <h1 className="text-lg font-black text-slate-100 uppercase tracking-wider">WAREHOUSE BILLING CORP</h1>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">100 Logistics Way, suite 4B</p>
                  <p className="text-xs text-slate-500 font-mono">support@billingcorp.com</p>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold text-indigo-400 font-mono">{activeInvoice.id}</h2>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">Fulfillment Bill Of Lading</p>
                </div>
              </div>

              {/* Client specifications */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/20 p-3 rounded-lg border border-slate-850">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Billed To:</span>
                  <strong className="text-slate-200 block text-sm">{activeInvoice.customerName}</strong>
                  <span className="text-slate-400 mt-1 block">Account Settled: Yes</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block mb-1">Issue Specifics:</span>
                  <p className="font-mono text-slate-300"><span className="text-slate-400">Date:</span> {new Date(activeInvoice.date).toLocaleDateString()}</p>
                  <p className="font-mono text-slate-300"><span className="text-slate-400">Time:</span> {new Date(activeInvoice.date).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* List of billed goods */}
              <div className="space-y-3">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold block">Itemized Account Summary</span>
                <div className="border border-slate-800 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-slate-900 border-b border-slate-800 p-2.5 font-bold text-slate-400">
                    <div className="col-span-6">Particulars Description</div>
                    <div className="col-span-2 text-right">Price</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-2 text-right">Extended</div>
                  </div>
                  {activeInvoice.items.map(item => {
                    const matchedQty = activeInvoice.billingSelections?.[item.id] ?? item.qty;
                    return (
                      <div key={item.id} className="grid grid-cols-12 p-2.5 border-b border-slate-850/60" id={`pdf-item-row-${item.id}`}>
                        <div className="col-span-6">
                          <span className="font-bold text-slate-200 block">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{item.SKU}</span>
                        </div>
                        <div className="col-span-2 text-right font-mono">${item.price}</div>
                        <div className="col-span-2 text-right font-mono">{matchedQty}</div>
                        <div className="col-span-2 text-right font-mono text-indigo-300 font-bold">${matchedQty * item.price}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Highlighting specific notes per item (Requirement 3) */}
              {currentInvoiceNotes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-yellow-500 uppercase tracking-widest font-bold block">Consolidated Item Custom Notes</span>
                  <div className="space-y-2">
                    {currentInvoiceNotes.map((nt, index) => (
                      <div key={index} className="p-2.5 bg-yellow-555/5 bg-yellow-950/20 border border-yellow-500/20 rounded-lg text-xs text-yellow-300 leading-relaxed">
                        <span className="font-bold text-yellow-200">[{nt.name}] :</span> {nt.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Math tally */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <div className="w-52 text-right space-y-1.5 text-xs text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Tax Assessment:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-400 border-t border-slate-800 pt-1.5">
                    <span>Amount Settled:</span>
                    <span>${activeInvoice.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 border-2 border-dashed border-slate-700/50 rounded-xl p-6">
            <FileText className="w-10 h-10 text-slate-600 animate-pulse" />
            <span className="text-sm font-semibold">No Settled Invoice Selected</span>
            <span className="text-xs text-slate-600 text-center">Highlight a closed/billed account in left column to generate printable documents</span>
          </div>
        )}
      </div>
    </div>
  );
}
