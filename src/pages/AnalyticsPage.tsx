import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package, TrendingUp, AlertCircle, ShieldAlert, ShoppingBag, Download } from 'lucide-react';
import { InventoryItem, UsageRecord } from '../types';
import { getInventory } from '../services/inventoryService';
import { getCurrentUser } from '../services/authService';
import { getPatientUsageHistory } from '../services/patientService';

export function AnalyticsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [patientUsageHistory, setPatientUsageHistory] = useState<UsageRecord[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const load = async () => {
      const user = getCurrentUser();
      if (user) {
        setUserRole(user.role);
      }

      const [inventoryData, patientUsageData] = await Promise.all([
        getInventory(),
        getPatientUsageHistory(),
      ]);

      setInventory(inventoryData);
      setPatientUsageHistory(patientUsageData);
    };

    load().catch((error) => console.error('Failed to load analytics data:', error));
  }, []);

  // If user is staff, show access denied message
  if (userRole === 'staff') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md text-center">
          <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            Analytics and reports are only available to administrators.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your system administrator if you need access to this feature.
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(item => item.quantity <= item.lowStockThreshold).length;
  const expiringIn30Days = inventory.filter(item => {
    const daysUntilExpiry = Math.floor((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  // Calculate total value (mock prices)
  const totalValue = inventory.reduce((sum, item) => {
    const mockPrice = item.quantity * 25; // Mock price calculation
    return sum + mockPrice;
  }, 0);

  // Category data for bar chart
  const categoryData = inventory.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.category);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({
        name: item.category,
        quantity: item.quantity
      });
    }
    return acc;
  }, [] as { name: string; quantity: number }[]);

  // Stock levels vs thresholds data (top 10 items)
  const stockLevelData = inventory
    .slice(0, 10)
    .map(item => ({
      name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
      current: item.quantity,
      threshold: item.lowStockThreshold,
    }));

  // Most used procedures from patient usage records
  const procedureUsageData = patientUsageHistory.reduce((acc, record) => {
    const procedureName = record.procedure?.trim() || 'Unspecified Procedure';
    const existing = acc.find(x => x.name === procedureName);
    const itemsUsed = record.items.reduce((sum, item) => sum + item.quantityUsed, 0);

    if (existing) {
      existing.count += 1;
      existing.itemsUsed += itemsUsed;
    } else {
      acc.push({
        name: procedureName,
        count: 1,
        itemsUsed,
      });
    }

    return acc;
  }, [] as { name: string; count: number; itemsUsed: number }[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Monthly expenses data (mock)
  const monthlyExpensesData = [
    { month: 'Jan', amount: 4200 },
    { month: 'Feb', amount: 3800 },
    { month: 'Mar', amount: 4500 },
    { month: 'Apr', amount: 3900 },
    { month: 'May', amount: 4700 },
    { month: 'Jun', amount: 5100 },
    { month: 'Jul', amount: 4800 },
    { month: 'Aug', amount: 5200 },
    { month: 'Sep', amount: 4900 },
    { month: 'Oct', amount: 5300 },
    { month: 'Nov', amount: 5000 },
    { month: 'Dec', amount: 5400 },
  ];

  // Category summary data
  const categorySummary = inventory.reduce((acc, item) => {
    const existing = acc.find(x => x.category === item.category);
    const isLowStock = item.quantity <= item.lowStockThreshold;

    if (existing) {
      existing.products += 1;
      if (isLowStock) existing.lowStock += 1;
    } else {
      acc.push({
        category: item.category,
        products: 1,
        lowStock: isLowStock ? 1 : 0,
        color: getCategoryColor(item.category)
      });
    }
    return acc;
  }, [] as { category: string; products: number; lowStock: number; color: string }[]);

  // Helper function to get category colors
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Preventive Care': 'bg-purple-500',
      'Anesthetics': 'bg-cyan-500',
      'Restorative': 'bg-orange-500',
      'Infection Control': 'bg-yellow-500',
      'Endodontics': 'bg-pink-500',
      'Prosthetics': 'bg-teal-500',
    };
    return colors[category] || 'bg-gray-500';
  }

  // Calculate filtered usage history based on report period
  const getFilteredUsageHistory = () => {
    const now = new Date();
    const cutoff = new Date();
    if (reportPeriod === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (reportPeriod === 'month') {
      cutoff.setMonth(now.getMonth() - 1);
    } else if (reportPeriod === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    }
    return patientUsageHistory.filter(record => new Date(record.date) >= cutoff);
  };

  const filteredHistory = getFilteredUsageHistory();

  // Print View: Most Used Products (filtered)
  const productUsageMap = new Map<string, { name: string, quantity: number, unit: string }>();
  filteredHistory.forEach(record => {
    record.items.forEach(item => {
      if (productUsageMap.has(item.productId)) {
        productUsageMap.get(item.productId)!.quantity += item.quantityUsed;
      } else {
        productUsageMap.set(item.productId, { name: item.productName, quantity: item.quantityUsed, unit: item.unit });
      }
    });
  });
  const mostUsedProducts = Array.from(productUsageMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const filteredProcedureData = filteredHistory.reduce((acc, record) => {
    const procedureName = record.procedure?.trim() || 'Unspecified Procedure';
    const existing = acc.find(x => x.name === procedureName);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: procedureName, count: 1 });
    }
    return acc;
  }, [] as { name: string; count: number }[]).sort((a, b) => b.count - a.count).slice(0, 6);

  const totalFilteredProcedures = filteredProcedureData.reduce((sum, proc) => sum + proc.count, 0);
  const periodExpenses = reportPeriod === 'week' ? 1200 : (reportPeriod === 'month' ? 4500 : 54000); // Mock

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as 'week' | 'month' | 'year')}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 outline-none focus:ring-2 focus:ring-gold-500 w-full sm:w-auto shadow-sm"
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
            </select>
            <button
              onClick={() => window.print()}
              className="print:hidden flex items-center space-x-2 bg-dark-900 hover:bg-black text-gold-400 px-6 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto font-bold justify-center whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              <span>Generate PDF Report</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Products Card */}
          <div className="bg-gold-600 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-white rounded-lg p-3">
              <Package className="w-6 h-6 text-gold-600" />
            </div>
            <p className="text-5xl font-bold mb-1">{totalItems}</p>
            <p className="text-gold-100 text-sm">Total Products</p>
          </div>

          {/* Low Stock Card */}
          <div className="bg-orange-500 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-white rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-5xl font-bold mb-1">{lowStockCount}</p>
            <p className="text-orange-100 text-sm">Low Stock Items</p>
          </div>

          {/* Expiring Soon Card */}
          <div className="bg-red-500 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-white rounded-lg p-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-5xl font-bold mb-1">{expiringIn30Days}</p>
            <p className="text-red-100 text-sm">Expiring Soon</p>
          </div>

          {/* Total Value Card */}
          <div className="bg-green-500 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-white rounded-lg p-3">
              <span className="block text-2xl font-black leading-none text-green-500">₱</span>
            </div>
            <p className="text-4xl font-bold mb-1">₱{totalValue.toLocaleString()}</p>
            <p className="text-green-100 text-sm">Total Value</p>
          </div>
        </div>

        {/* Current Stock Levels vs Thresholds */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Current Stock Levels vs Thresholds</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stockLevelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                angle={-20}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Current Stock"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="threshold"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Threshold"
                dot={{ fill: '#f59e0b', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Most Used Procedures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Most Used Procedures</h2>
          {procedureUsageData.length === 0 ? (
            <p className="text-sm text-gray-500">No patient usage records yet. Record patient usage to see procedure trends.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={procedureUsageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    style={{ fontSize: '11px' }}
                    angle={-20}
                    textAnchor="end"
                    height={90}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'count') return [value, 'Times Recorded'];
                      if (name === 'itemsUsed') return [value.toFixed(2), 'Total Items Used'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="count" name="Times Recorded" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">PROCEDURE</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">TIMES RECORDED</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">TOTAL ITEMS USED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedureUsageData.map((item) => (
                      <tr key={item.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="py-4 px-4 text-sm text-gray-900">{item.count}</td>
                        <td className="py-4 px-4 text-sm text-gray-900">{item.itemsUsed.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Row: Total Quantity by Category & Monthly Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Quantity by Category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Total Quantity by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  angle={-20}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar
                  dataKey="quantity"
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Expenses Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Monthly Expenses Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyExpensesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `₱${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Summary Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Category Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CATEGORY</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">PRODUCTS</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">LOW STOCK</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {categorySummary.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium text-gray-900">{item.category}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-900">{item.products}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-900">{item.lowStock}</span>
                    </td>
                    <td className="py-4 px-4">
                      <button className="flex items-center space-x-2 text-orange-500 hover:text-orange-600 transition text-sm">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Restock</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINT VIEW (Only visible on print, perfectly formatted for 1 page) */}
      <div className="hidden print:block bg-white text-gray-900 absolute top-0 left-0 right-0 p-8 w-[210mm] h-[297mm] mx-auto overflow-hidden">
        <div className="border-b-2 border-dark-900 pb-4 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black text-dark-900 uppercase tracking-tight">Dental IMS</h1>
              <p className="text-xl text-gold-600 font-bold mt-1">Analytics Summary Report</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Report Period</p>
              <p className="text-xl font-bold text-dark-900 capitalize">Past {reportPeriod}</p>
              <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Print Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase">Estimated Expenses</p>
            <p className="text-2xl font-black text-dark-900">₱{periodExpenses.toLocaleString()}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase">Procedures Done</p>
            <p className="text-2xl font-black text-dark-900">{totalFilteredProcedures}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase">Items Low Stock</p>
            <p className="text-2xl font-black text-red-600">{lowStockCount}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase">Total Inventory Value</p>
            <p className="text-2xl font-black text-dark-900">₱{totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Top Procedures */}
          <div>
            <h3 className="text-lg font-bold text-dark-900 border-b border-gray-200 pb-2 mb-4">Frequent Procedures</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2">Procedure</th>
                  <th className="pb-2 text-right">Times Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProcedureData.slice(0, 6).map((proc, i) => (
                  <tr key={i}>
                    <td className="py-2 font-semibold text-dark-900">{proc.name}</td>
                    <td className="py-2 text-right text-gray-600">{proc.count}</td>
                  </tr>
                ))}
                {filteredProcedureData.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-gray-400 italic">No procedures recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Most Used Products */}
          <div>
            <h3 className="text-lg font-bold text-dark-900 border-b border-gray-200 pb-2 mb-4">Most Used Products</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2 text-right">Qty Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mostUsedProducts.map((prod, i) => (
                  <tr key={i}>
                    <td className="py-2 font-semibold text-dark-900">{prod.name}</td>
                    <td className="py-2 text-right text-gray-600">{prod.quantity} {prod.unit}</td>
                  </tr>
                ))}
                {mostUsedProducts.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-gray-400 italic">No products consumed.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Items (Full Width) */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-4">Critical Action Required: Low Stock</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="pb-2">Product Name</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Current Stock</th>
                <th className="pb-2 text-right">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.filter(i => i.quantity <= i.lowStockThreshold).slice(0, 10).map((item, i) => (
                <tr key={i}>
                  <td className="py-2 font-semibold text-dark-900">{item.productName}</td>
                  <td className="py-2 text-gray-600">{item.category}</td>
                  <td className="py-2 text-right font-bold text-red-600">{item.quantity} {item.unit}</td>
                  <td className="py-2 text-right text-gray-500">{item.lowStockThreshold} {item.unit}</td>
                </tr>
              ))}
              {inventory.filter(i => i.quantity <= i.lowStockThreshold).length === 0 && (
                <tr><td colSpan={4} className="py-4 text-gray-400 italic">No items are currently low on stock.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>This report was auto-generated by the Dental IMS system.</p>
        </div>
      </div>
    </>
  );
}
