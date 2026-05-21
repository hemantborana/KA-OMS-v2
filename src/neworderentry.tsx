import React, { useState, useEffect } from 'react';
import { getStock, getOrders, saveOrders, StockItem, CartItem, Order } from './db';
import { triggerHaptic } from './utils/haptics';
import { ShoppingCart, Search, Plus, Minus, Trash2, ArrowRight, User, Sparkles, MessageSquare, ClipboardList } from 'lucide-react';

interface NewOrderEntryProps {
  onOrderAdded: () => void;
  setActiveTab: (tab: string) => void;
}

export default function NewOrderEntry({ onOrderAdded, setActiveTab }: NewOrderEntryProps) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load stock to select items from
  useEffect(() => {
    setStock(getStock());
  }, []);

  const categories = ['All', ...Array.from(new Set(stock.map(s => s.category)))];

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.SKU.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: StockItem) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.qty >= item.stockQty) {
        triggerHaptic('warning');
        alert(`Cannot exceed available warehouse stock (${item.stockQty} units)`);
        return;
      }
      triggerHaptic('adjust');
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      if (item.stockQty <= 0) {
        triggerHaptic('warning');
        alert("This item is completely out of stock and cannot be added to a new order!");
        return;
      }
      triggerHaptic('adjust');
      setCart([...cart, {
        id: item.id,
        name: item.name,
        SKU: item.SKU,
        price: item.price,
        qty: 1,
        note: '' // Start with empty note
      }]);
    }
  };

  const updateCartQty = (id: string, newQty: number, maxQty: number) => {
    if (newQty <= 0) {
      triggerHaptic('warning');
      setCart(cart.filter(c => c.id !== id));
      return;
    }
    if (newQty > maxQty) {
      triggerHaptic('warning');
      alert(`Cannot exceed available warehouse stock (${maxQty} units)`);
      return;
    }
    triggerHaptic('adjust');
    setCart(cart.map(c => c.id === id ? { ...c, qty: newQty } : c));
  };

  const updateCartItemNote = (id: string, note: string) => {
    setCart(cart.map(c => c.id === id ? { ...c, note } : c));
  };

  const removeFromCart = (id: string) => {
    triggerHaptic('warning');
    setCart(cart.filter(c => c.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter customer name to place order.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty! Add at least one item.");
      return;
    }

    const newOrder: Order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName.trim(),
      date: new Date().toISOString(),
      items: cart,
      status: 'pending',
      totalAmount: getCartTotal(),
      billingSelections: {} // empty stock removal quantities to start with
    };

    const currentOrders = getOrders();
    const updated = [newOrder, ...currentOrders];
    saveOrders(updated);
    
    // Clear state
    setCart([]);
    setCustomerName('');
    triggerHaptic('success');
    onOrderAdded();
    
    // Auto shift to pending order view
    setActiveTab('pending');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="new-order-panel">
      {/* Stock Selection Column */}
      <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Pick Stock Items
          </h2>
          <p className="text-xs text-slate-400">Select items from catalog below to add them to customer order</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name or SKU..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="stock-search-input"
            />
          </div>
          <select
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            id="category-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Stock list container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="pickable-stock-list">
          {filteredStock.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No matching merchandise item in warehouse
            </div>
          ) : (
            filteredStock.map(item => {
              const cartItem = cart.find(c => c.id === item.id);
              const isAdded = !!cartItem;
              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isAdded 
                      ? 'border-indigo-500/50 bg-indigo-500/10' 
                      : 'border-slate-700/60 bg-slate-900/50 hover:bg-slate-900'
                  }`}
                  id={`stock-item-${item.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 text-sm sm:text-base">{item.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded bg-slate-800 text-indigo-300 font-mono border border-indigo-500/10">
                        {item.SKU}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>Category: <strong className="text-slate-300">{item.category}</strong></span>
                      <span>Rate: <strong className="text-indigo-400">${item.price}</strong></span>
                      <span>Total Available: <strong className={item.stockQty < 5 ? 'text-red-400' : 'text-emerald-400'}>{item.stockQty}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={item.stockQty <= 0}
                    type="button"
                    className={`p-2 rounded-lg transition-all ${
                      item.stockQty <= 0 
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : isAdded 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                          : 'bg-slate-800 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300'
                    }`}
                    id={`add-btn-${item.id}`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart & Client Entry Column */}
      <form onSubmit={submitOrder} className="lg:col-span-5 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]" id="order-cart-form">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Fulfillment Cart
            {cart.length > 0 && (
              <span className="ml-auto bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 text-xs rounded-full">
                {cart.reduce((sum, c) => sum + c.qty, 0)} items
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Specify customer credentials and add individual item notes here</p>
        </div>

        {/* Customer Input Row */}
        <div className="mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            Customer / Receiver Name
          </label>
          <input
            type="text"
            required
            placeholder="Type customer's name..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            id="customer-name-field"
          />
        </div>

        {/* Cart Item Scrolling List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4" id="cart-item-list">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 border-2 border-dashed border-slate-700/50 rounded-xl p-6">
              <ShoppingCart className="w-10 h-10 text-slate-600 animate-bounce" />
              <span className="text-sm">No items in draft check-out cart.</span>
              <span className="text-xs text-slate-600 text-center">Click "+" buttons in left section to begin compounding items</span>
            </div>
          ) : (
            cart.map(item => {
              const matchedStockItem = stock.find(s => s.id === item.id);
              const maxAvailable = matchedStockItem ? matchedStockItem.stockQty : 100;

              return (
                <div key={item.id} className="bg-slate-900/40 rounded-xl border border-slate-700/50 p-3 space-y-2.5 transition-all hover:border-slate-600/75" id={`cart-row-${item.id}`}>
                  {/* Title and Delete Action */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm leading-snug">{item.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">${item.price} each</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                      id={`delete-cart-row-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity adjustment & Item Notes */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 flex items-center font-mono font-semibold">
                      Qty: 
                    </span>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.qty - 1, maxAvailable)}
                        className="bg-slate-800 text-slate-300 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700 transition"
                        id={`cart-minus-${item.id}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-slate-100 text-base px-2">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.qty + 1, maxAvailable)}
                        className="bg-slate-800 text-slate-300 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700 transition"
                        id={`cart-plus-${item.id}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* NOTE INPUT SYSTEM */}
                  <div className="relative">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-yellow-500" />
                      Add Note (Will show highlight details in Pending Order list):
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-yellow-500/50 rounded-md px-2.5 py-1.5 text-xs text-yellow-300 placeholder-slate-600 focus:outline-none"
                      placeholder="e.g. Wrap as birthday gift, extra checks..."
                      value={item.note || ''}
                      onChange={e => updateCartItemNote(item.id, e.target.value)}
                      id={`cart-note-input-${item.id}`}
                    />
                    {item.note && (
                      <span className="absolute right-2 top-7 flex h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total Cost and Action Bar */}
        <div className="border-t border-slate-700/60 pt-4 mt-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-slate-400">Est. Order Value:</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-300 font-mono">
              ${getCartTotal().toLocaleString()}
            </span>
          </div>
          
          <button
            type="submit"
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              cart.length === 0 
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-slate-950 font-black tracking-wide cursor-pointer'
            }`}
            id="draft-order-checkout-button"
          >
            <span>Create Pending Dispatch Order</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
