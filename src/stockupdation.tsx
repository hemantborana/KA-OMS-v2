import React, { useState, useEffect } from 'react';
import { getStock, saveStock, StockItem } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  Plus, 
  Minus, 
  Edit3, 
  PlusCircle, 
  CheckCircle, 
  FilePlus, 
  RefreshCw,
  TrendingUp,
  Tag,
  DollarSign,
  Barcode
} from 'lucide-react';

export default function StockUpdation() {
  const [stock, setStock] = useState<StockItem[]>([]);
  
  // Replenish values: state dictionary mapping id -> change input quantity
  const [replenishQtys, setReplenishQtys] = useState<Record<string, string>>({});

  // New Item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemSKU, setNewItemSKU] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = () => {
    setStock(getStock());
  };

  // Adjust current stock count directly in the database
  const handleModifyExistQty = (id: string, delta: number) => {
    const updated = stock.map(item => {
      if (item.id === id) {
        const target = item.stockQty + delta;
        if (target < 0) {
          triggerHaptic('warning');
          return item; // no modification if negative
        }
        triggerHaptic('adjust');
        return { ...item, stockQty: target };
      }
      return item;
    });

    setStock(updated);
    saveStock(updated);
  };

  // Process manual bulk add/replenishment from text field input
  const processReplenishmentInput = (id: string) => {
    const editStr = replenishQtys[id] || '';
    const addAmt = parseInt(editStr, 10);

    if (isNaN(addAmt) || addAmt <= 0) {
      triggerHaptic('warning');
      alert("Error: Please provide a positive integer value to replenish.");
      return;
    }

    const updated = stock.map(item => {
      if (item.id === id) {
        return { ...item, stockQty: item.stockQty + addAmt };
      }
      return item;
    });

    setStock(updated);
    saveStock(updated);
    triggerHaptic('success');

    // clear input
    setReplenishQtys(prev => ({ ...prev, [id]: '' }));
    alert(`Successfully added ${addAmt} units to stock!`);
  };

  // Creates a brand new item in the stock registry
  const handleAddNewProductItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newItemName.trim() || !newItemCategory.trim() || !newItemSKU.trim() || !newItemPrice || !newItemQty) {
      alert("Please populate all parameters to register product.");
      return;
    }

    const parsedPrice = parseFloat(newItemPrice);
    const parsedQty = parseInt(newItemQty, 10);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Price should be positive float numeral.");
      return;
    }

    if (isNaN(parsedQty) || parsedQty < 0) {
      alert("Initial stack volume must be positive integer.");
      return;
    }

    // Check pre-existing SKU codes
    const skuExists = stock.some(s => s.SKU.trim().toLowerCase() === newItemSKU.trim().toLowerCase());
    if (skuExists) {
      triggerHaptic('warning');
      alert(`Conflict: SKU code ${newItemSKU} is already assigned to a merchandise item.`);
      return;
    }

    const newPrd: StockItem = {
      id: `STK-${Date.now().toString().slice(-4)}`,
      name: newItemName.trim(),
      category: newItemCategory.trim(),
      SKU: newItemSKU.trim().toUpperCase(),
      price: parsedPrice,
      stockQty: parsedQty
    };

    const updated = [...stock, newPrd];
    setStock(updated);
    saveStock(updated);
    triggerHaptic('success');

    // Reset inputs
    setNewItemName('');
    setNewItemCategory('');
    setNewItemSKU('');
    setNewItemPrice('');
    setNewItemQty('');

    alert(`Registered "${newPrd.name}" as new warehouse product.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="stock-adjuster-panel">
      {/* List / Live Replenisher Column */}
      <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Replenish Warehouse Stocks
          </h2>
          <p className="text-xs text-slate-400">Increase or decrease counts of active items directly</p>
        </div>

        {/* Stock List with single items and replenishment inputs */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" id="replenish-list">
          {stock.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Zero storage items in inventory registry. Populate a new product at right panel to begin.
            </div>
          ) : (
            stock.map(item => (
              <div 
                key={item.id} 
                className="bg-slate-900/40 rounded-xl border border-slate-700/50 p-3.5 space-y-2"
                id={`replenish-box-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>SKU: <strong className="text-slate-300 font-mono text-[11px]">{item.SKU}</strong></span>
                      <span>•</span>
                      <span>Category: <strong className="text-slate-300">{item.category}</strong></span>
                    </div>
                  </div>
                  
                  {/* Current stock with fast increment pill */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Current Unit Count</span>
                    <strong className={`font-mono text-base ${item.stockQty < 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {item.stockQty} pcs
                    </strong>
                  </div>
                </div>

                {/* Adjustments row */}
                <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800">
                  {/* Fast Tick buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleModifyExistQty(item.id, -1)}
                      className="p-1 px-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 text-xs font-bold transition flex items-center justify-center gap-1"
                      id={`fast-minus-${item.id}`}
                    >
                      <Minus className="w-3 h-3" />
                      <span>1</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModifyExistQty(item.id, 1)}
                      className="p-1 px-2.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 text-xs font-bold transition flex items-center justify-center gap-1"
                      id={`fast-plus-${item.id}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>1</span>
                    </button>
                  </div>

                  {/* Manual numerical entry of bulk pieces */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="+ Add bulk..."
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-mono placeholder:text-slate-600 shadow-inner"
                      value={replenishQtys[item.id] || ''}
                      onChange={e => setReplenishQtys({ ...replenishQtys, [item.id]: e.target.value })}
                      id={`bulk-input-${item.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => processReplenishmentInput(item.id)}
                      className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition"
                      id={`bulk-submit-${item.id}`}
                    >
                      Replenish
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Product Registration Column */}
      <div className="lg:col-span-5 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            Add New Products
          </h2>
          <p className="text-xs text-slate-400 font-medium">Introduce a brand new merchandise item to catalog</p>
        </div>

        <form onSubmit={handleAddNewProductItem} className="space-y-4 flex-1 overflow-y-auto pr-1" id="new-item-form">
          {/* Title input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Product / Item Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Running Shoes..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              id="new-item-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Category code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Category
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apparel"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                id="new-item-cat"
              />
            </div>

            {/* SKU Input code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-indigo-400" />
                SKU Tag
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A-APEX-X"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono uppercase placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={newItemSKU}
                onChange={e => setNewItemSKU(e.target.value)}
                id="new-item-sku"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Price tag */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Unit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Price value..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value)}
                id="new-item-price"
              />
            </div>

            {/* Initial Qty */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Initial Stock Qty
              </label>
              <input
                type="number"
                required
                placeholder="Volume e.g. 100..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                value={newItemQty}
                onChange={e => setNewItemQty(e.target.value)}
                id="new-item-qty"
              />
            </div>
          </div>

          {/* Prompt */}
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-400/20 text-[11px] text-indigo-300 leading-relaxed">
            Note: Registering a product imports it directly as active merchandise with specified stock values which are immediately pickable by staff performing client order drafts.
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-slate-950 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 tracking-wide font-extrabold cursor-pointer mt-4"
            id="submit-register-btn"
          >
            <FilePlus className="w-5 h-5" />
            <span>Register & Initialize Goods</span>
          </button>
        </form>
      </div>
    </div>
  );
}
