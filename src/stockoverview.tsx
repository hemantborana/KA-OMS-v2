import React, { useState, useEffect } from 'react';
import { getStock, StockItem } from './db';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  FileText, 
  RefreshCw,
  Box,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function StockOverview() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    setStock(getStock());
  }, []);

  const handleRefresh = () => {
    setStock(getStock());
  };

  const categories = ['All', ...Array.from(new Set(stock.map(s => s.category)))];

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.SKU.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate Metrics
  const totalItems = stock.reduce((sum, item) => sum + item.stockQty, 0);
  const outOfStock = stock.filter(item => item.stockQty === 0).length;
  const lowStock = stock.filter(item => item.stockQty > 0 && item.stockQty < 10).length;

  // Chart data formatting
  const chartData = filteredStock.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    stock: item.stockQty,
    price: item.price
  }));

  return (
    <div className="space-y-6" id="stock-overview-panel">
      {/* Metric Bento Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Warehouse Stock</span>
            <h3 className="text-2xl font-black text-slate-100 font-mono">{totalItems} <span className="text-xs text-slate-500 font-medium">pcs</span></h3>
            <p className="text-[10px] text-indigo-400 font-medium">Cumulative units in stock</p>
          </div>
          <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Empty SKUs</span>
            <h3 className="text-2xl font-black text-red-400 font-mono">{outOfStock} <span className="text-xs text-slate-500 font-medium">items</span></h3>
            <p className="text-[10px] text-red-500/80 font-medium">Require immediate backorder</p>
          </div>
          <div className="h-12 w-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <h3 className="text-2xl font-black text-yellow-400 font-mono">{lowStock} <span className="text-xs text-slate-500 font-medium">items</span></h3>
            <p className="text-[10px] text-yellow-400/80 font-medium">Fewer than 10 units left</p>
          </div>
          <div className="h-12 w-12 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center border border-yellow-500/20">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Merchandise Value</span>
            <h3 className="text-2xl font-black text-emerald-400 font-mono">
              ${stock.reduce((acc, item) => acc + (item.price * item.stockQty), 0).toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-400/80 font-medium">Est. capital asset value</p>
          </div>
          <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Chart Section */}
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Stock Availability Chart
            </h3>
            <p className="text-xs text-slate-400">Visual comparison of currently filtered assets</p>
          </div>
          
          <button 
            type="button" 
            onClick={handleRefresh}
            className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition"
            id="refresh-stock"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="h-64" id="recharts-wrapper">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No items selected to render comparison
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                />
                <Bar dataKey="stock" name="Warehouse Qty">
                  {chartData.map((entry, index) => {
                    // color bar depending on stock availability
                    const value = entry.stock;
                    const color = value === 0 ? '#ef4444' : value < 10 ? '#eab308' : '#6366f1';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stock Table Catalog */}
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center mb-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog by SKU or title..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="catalog-search"
            />
          </div>

          <div className="flex gap-2">
            <select
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              id="catalog-category-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List of items */}
        <div className="overflow-x-auto rounded-xl border border-slate-700" id="catalog-table-wrapper">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400 font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-900/10">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No matching item available in inventory catalog
                  </td>
                </tr>
              ) : (
                filteredStock.map(item => {
                  const isOutOfStock = item.stockQty === 0;
                  const isLowStock = item.stockQty > 0 && item.stockQty < 10;

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50 group" id={`catalog-row-${item.id}`}>
                      <td className="py-3.5 px-4 font-bold text-slate-200 group-hover:text-slate-100">{item.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-indigo-400">{item.SKU}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{item.category}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300 font-semibold">${item.price}</td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isOutOfStock ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-emerald-400'
                      }`}>
                        {item.stockQty}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isOutOfStock 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : isLowStock 
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'SUFFICIENT'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
