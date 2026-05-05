import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, Calendar } from 'lucide-react';
import { InventoryItem } from '../types';
import { getInventory } from '../services/inventoryService';
import { getCurrentUser } from '../services/authService';

export function DashboardPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');

  useEffect(() => {
    const load = async () => {
      setInventory(await getInventory());
      const user = getCurrentUser();
      if (user) {
        setUserRole(user.role);
      }
    };

    load().catch((error) => console.error('Failed to load dashboard data:', error));
  }, []);

  // Calculate inventory summary by category
  const inventorySummary = inventory.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.category);
    if (existing) {
      existing.value += item.quantity;
    } else {
      acc.push({ name: item.category, value: item.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Original vibrant colors for charts
  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const expenseData = inventory.reduce((acc, item) => {
    const date = item.dateCreated ? new Date(item.dateCreated) : new Date();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const existing = acc.find((entry) => entry.month === month);
    const amount = item.quantity * item.price;

    if (existing) {
      existing.amount += amount;
    } else {
      acc.push({ month, amount });
    }

    return acc;
  }, [] as { month: string; amount: number }[]);

  // Filter expense data based on timeframe
  const getExpenseData = () => {
    switch (timeframe) {
      case 'week':
        return expenseData.slice(-1).map((item, index) => ({
          ...item,
          month: `Week ${index + 1}`,
        }));
      case 'month':
        return expenseData.slice(-3);
      case 'year':
        return expenseData;
      default:
        return expenseData;
    }
  };

  // Get low stock items
  const lowStockItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);

  // Get expiring soon items (within 60 days)
  const expiringItems = inventory.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
  });

  const thisMonthExpense = expenseData[expenseData.length - 1]?.amount || 0;

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, isDark = false }: any) => (
    <div className={`${isDark ? 'bg-gradient-to-br from-dark-900 to-dark-800 text-white' : 'bg-white'} p-5 sm:p-6 rounded-2xl shadow-lg border ${isDark ? 'border-dark-700' : 'border-gray-100'} transition-transform hover:-translate-y-1 duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs sm:text-sm font-medium uppercase tracking-wider`}>{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>{value}</p>
        </div>
        <div className={`${bgClass} p-3 sm:p-4 rounded-xl shadow-inner`}>
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${colorClass}`} />
        </div>
      </div>
    </div>
  );

  // Staff View - Simplified Dashboard
  if (userRole === 'staff') {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-dark-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Overview of inventory costs and levels</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <StatCard 
            title="Total Items" 
            value={inventory.length} 
            icon={Package} 
            colorClass="text-gold-500" 
            bgClass="bg-dark-900"
            isDark={true}
          />
          <StatCard 
            title="Low Stock Alert" 
            value={lowStockItems.length} 
            icon={AlertTriangle} 
            colorClass="text-red-500" 
            bgClass="bg-red-50"
          />
        </div>

        {/* Charts - Staff View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Cost - Vertical Bar Chart */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-dark-900 mb-6">Monthly Cost Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" stroke="#888" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#888" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f6f6f6' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    color: '#1E1E1E',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#1E1E1E', fontWeight: 600 }}
                  labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                />
                <Bar dataKey="amount" fill="#cf984d" name="Cost (₱)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Inventory Level Pie Chart */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-dark-900 mb-6">Inventory Level by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventorySummary}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                >
                  {inventorySummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    color: '#1E1E1E',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#1E1E1E', fontWeight: 600 }}
                  formatter={(value: number) => [`${value} units`, 'Quantity']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // Admin View - Full Dashboard
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-dark-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">Comprehensive clinic inventory metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Items" 
          value={inventory.length} 
          icon={Package} 
          colorClass="text-gold-400" 
          bgClass="bg-dark-800"
          isDark={true}
        />
        <StatCard 
          title="Low Stock" 
          value={lowStockItems.length} 
          icon={AlertTriangle} 
          colorClass="text-orange-500" 
          bgClass="bg-orange-50"
        />
        <StatCard 
          title="Expiring Soon" 
          value={expiringItems.length} 
          icon={Calendar} 
          colorClass="text-red-500" 
          bgClass="bg-red-50"
        />
        <StatCard 
          title="This Month" 
          value={`₱${thisMonthExpense.toLocaleString()}`} 
          icon={TrendingUp} 
          colorClass="text-green-500" 
          bgClass="bg-green-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Chart */}
        <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-dark-900">Total Expense</h2>
            <div className="flex space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
              {['week', 'month', 'year'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf as any)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timeframe === tf
                      ? 'bg-dark-900 text-gold-400 shadow-md'
                      : 'text-gray-500 hover:text-dark-900'
                  }`}
                >
                  {tf.charAt(0).toUpperCase() + tf.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={getExpenseData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#888" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#1E1E1E',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#1E1E1E', fontWeight: 600 }}
                labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#cf984d" 
                strokeWidth={3}
                dot={{ fill: '#1E1E1E', stroke: '#cf984d', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#cf984d' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Summary Pie Chart */}
        <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-dark-900 mb-6">Inventory Summary</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={inventorySummary}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {inventorySummary.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#1E1E1E',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#1E1E1E', fontWeight: 600 }}
                formatter={(value: number) => [`${value} units`, 'Quantity']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Inventory Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-dark-900">Recent Inventory Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventory.slice(0, 5).map((item) => {
                const isLowStock = item.quantity <= item.lowStockThreshold;
                const expiryDate = new Date(item.expiryDate);
                const today = new Date();
                const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysUntilExpiry <= 60 && daysUntilExpiry > 0;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-dark-900">{item.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-600">
                        {item.quantity} {item.unit}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {isLowStock && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700">
                            Low Stock
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                            Expiring
                          </span>
                        )}
                        {!isLowStock && !isExpiringSoon && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700">
                            Good Status
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
