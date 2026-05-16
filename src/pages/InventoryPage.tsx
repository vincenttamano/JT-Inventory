import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, Package, History } from 'lucide-react';
import { InventoryItem, InventoryUpdateHistory } from '../types';
import {
  deleteInventoryItem,
  getInventory,
  getInventoryUpdateHistory,
  saveInventoryItem,
  updateInventoryQuantity,
} from '../services/inventoryService';
import { getCurrentUser } from '../services/authService';
import { InventoryItemModal } from '../components/inventory/InventoryItemModal';
import { QuantityAdjustModal } from '../components/inventory/QuantityAdjustModal';

export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [updateHistory, setUpdateHistory] = useState<InventoryUpdateHistory[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [inventoryItems, history] = await Promise.all([
          getInventory(),
          getInventoryUpdateHistory(),
        ]);
        setInventory(inventoryItems);
        setUpdateHistory(history);
        const user = getCurrentUser();
        if (user) {
          setUserRole(user.role);
        }
      } catch (error: any) {
        alert(error.message || 'Failed to load inventory.');
      }
    };

    load();
  }, []);

  const categories = Array.from(new Set(inventory.map(item => item.category)));

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAdmin = userRole === 'admin';

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    if (isAdmin) {
      setIsModalOpen(true);
    } else {
      setIsQuantityModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteInventoryItem(id);
        setInventory(inventory.filter(item => item.id !== id));
      } catch (error: any) {
        alert(error.message || 'Failed to delete inventory item.');
      }
    }
  };

  const handleSave = async (item: InventoryItem) => {
    try {
      const savedItem = await saveInventoryItem(item);
      setUpdateHistory(await getInventoryUpdateHistory());
      const updatedInventory = editingItem
        ? inventory.map(i => (i.id === savedItem.id ? savedItem : i))
        : [savedItem, ...inventory];

      setInventory(updatedInventory);
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to save inventory item.');
    }
  };

  const handleQuantityAdjust = async (item: InventoryItem, newQuantity: number) => {
    try {
      const currentUser = getCurrentUser();
      const savedItem = await updateInventoryQuantity(item, newQuantity, currentUser?.id);
      const updatedInventory = inventory.map(i =>
        i.id === savedItem.id ? savedItem : i
      );
      setInventory(updatedInventory);
      setUpdateHistory(await getInventoryUpdateHistory());
      setIsQuantityModalOpen(false);
      setSelectedItem(savedItem);
    } catch (error: any) {
      alert(error.message || 'Failed to adjust quantity.');
    }
  };

  const handleRowClick = (item: InventoryItem) => {
    if (!isAdmin) {
      setSelectedItem(item);
    }
  };

  const handleQuickAdjust = () => {
    if (selectedItem) {
      setEditingItem(selectedItem);
      setIsQuantityModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-dark-900 tracking-tight">Inventory Management</h1>
          {userRole === 'staff' && (
            <p className="text-sm text-gray-500 mt-1">Add and restock inventory items</p>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center space-x-2 bg-dark-900 hover:bg-black text-gold-400 shadow-lg hover:-translate-y-0.5 px-4 py-2 rounded-lg transition w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Quantity Adjustment Controls for Staff */}
      {!isAdmin && selectedItem && (
        <div className="bg-gradient-to-r from-gold-50 to-gold-50 p-4 sm:p-6 rounded-xl border border-gold-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gold-100 rounded-lg">
                <Package className="w-6 h-6 text-gold-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Selected Item</p>
                <h3 className="font-semibold text-gray-900">{selectedItem.productName}</h3>
                <p className="text-sm text-gray-500">
                  Current: {selectedItem.quantity} {selectedItem.unit} • {selectedItem.category}
                </p>
              </div>
            </div>
            <button
              onClick={handleQuickAdjust}
              className="flex items-center space-x-2 bg-dark-900 hover:bg-black text-gold-400 shadow-lg hover:-translate-y-0.5 px-6 py-3 rounded-lg transition shadow-sm w-full sm:w-auto justify-center"
            >
              <Edit2 className="w-5 h-5" />
              <span>Adjust Quantity</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State for Staff - No Item Selected */}
      {!isAdmin && !selectedItem && (
        <div className="bg-gray-50/80 backdrop-blur-sm p-6 rounded-xl border border-gray-200 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Select an item from the table below to adjust its quantity</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const isLowStock = item.quantity <= item.lowStockThreshold;
                const expiryDate = new Date(item.expiryDate);
                const today = new Date();
                const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysUntilExpiry <= 60 && daysUntilExpiry > 0;
                const isSelected = !isAdmin && selectedItem?.id === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-gold-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50/80 backdrop-blur-sm'
                    } ${!isAdmin ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{item.productName}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-1">{item.category}</div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-gray-900">
                        {item.quantity} {item.unit}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-gray-900">
                        ₱{item.price?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="hidden xl:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-gray-900">
                        {new Date(item.dateCreated).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-gray-900">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {isLowStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        )}
                        {isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expiring
                          </span>
                        )}
                        {!isLowStock && !isExpiringSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Good
                          </span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="text-gold-600 hover:text-gold-800 transition p-1"
                            title="Edit Item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="text-red-600 hover:text-red-800 transition p-1"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No items found
            </div>
          )}
        </div>
      </div>

      {/* Inventory Summary by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Inventory Summary by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from(new Set(inventory.map(item => item.category))).map(category => {
            const categoryItems = inventory.filter(item => item.category === category);
            const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const itemCount = categoryItems.length;
            const lowStockCount = categoryItems.filter(item => item.quantity <= item.lowStockThreshold).length;

            return (
              <div key={category} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{category}</h3>
                  {lowStockCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {lowStockCount} Low
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: <span className="font-medium">{totalQuantity}</span> units
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Restock Inventory History</h2>
            <p className="text-sm text-gray-500 mt-1">Recent inventory quantity updates from the transaction log</p>
          </div>
          <div className="p-2 bg-gold-100 rounded-lg text-gold-700">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Before
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  After
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {updateHistory.map((entry) => {
                const isRestock = entry.quantityChange > 0;

                return (
                  <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{entry.productName}</div>
                      <div className="sm:hidden text-xs text-gray-500 mt-1">
                        {entry.quantityBefore} to {entry.quantityAfter} {entry.unit}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isRestock
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isRestock ? 'Restock' : 'Adjustment'}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {entry.quantityBefore} {entry.unit}
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {entry.quantityAfter} {entry.unit}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs sm:text-sm font-bold ${
                        isRestock ? 'text-green-700' : 'text-orange-700'
                      }`}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange} {entry.unit}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                      {new Date(entry.changedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {updateHistory.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No inventory updates recorded yet
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <InventoryItemModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isQuantityModalOpen && editingItem && (
        <QuantityAdjustModal
          item={editingItem}
          onSave={handleQuantityAdjust}
          onClose={() => setIsQuantityModalOpen(false)}
        />
      )}
    </div>
  );
}
