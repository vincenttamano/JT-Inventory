import { useState, useEffect } from 'react';
import { Plus, Search, X, Calendar, Package, Trash2, Edit2 } from 'lucide-react';
import { InventoryItem, SimpleUsageRecord } from '../types';
import { getInventory, saveInventory } from '../services/inventoryService';
import { getCurrentUser } from '../services/authService';
import { createSimpleUsageRecord, deleteSimpleUsageRecord, getSimpleUsageHistory } from '../services/usageService';

export function UsagePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<SimpleUsageRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [procedure, setProcedure] = useState('');
  const [patientConsent, setPatientConsent] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setInventory(await getInventory());
      setUsageHistory(await getSimpleUsageHistory());

      const user = getCurrentUser();
      if (user) {
        setUserRole(user.role);
      }
    };

    load().catch((error) => alert(error.message || 'Failed to load usage data.'));
  }, []);

  const isAdmin = userRole === 'admin';

  const handleAddItem = (itemId: string) => {
    const exists = selectedItems.find(item => item.itemId === itemId);
    if (!exists) {
      setSelectedItems([...selectedItems, { itemId, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(item => 
      item.itemId === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };

  const sendAdminNotificationEmail = (record: SimpleUsageRecord) => {
    console.log(`[EMAIL DISPATCHED] To: Admin`);
    console.log(`Subject: New Usage Recorded - ${record.procedure}`);
    console.log(`Details: ${record.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}`);
    
    // Simulate sending email notification
    setTimeout(() => {
      alert(`Success! The Admin has been notified via email about the "${record.procedure}" usage.`);
    }, 500);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }

    if (!procedure.trim()) {
      alert('Please enter the procedure');
      return;
    }

    if (patientConsent && !patientName.trim()) {
      alert('Please enter patient name or uncheck consent to keep name hidden');
      return;
    }

    let updatedInventory = [...inventory];

    // If editing, first refund the old quantities back to inventory
    if (editingRecordId) {
      const oldRecord = usageHistory.find(r => r.id === editingRecordId);
      if (oldRecord) {
        oldRecord.items.forEach(oldItem => {
          const invItem = updatedInventory.find(i => i.id === oldItem.itemId);
          if (invItem) {
            invItem.quantity += oldItem.quantity;
          }
        });
      }
    }

    // Now deduct the new quantities from inventory
    updatedInventory = updatedInventory.map(item => {
      const usedItem = selectedItems.find(si => si.itemId === item.id);
      if (usedItem) {
        return {
          ...item,
          quantity: Math.max(0, item.quantity - usedItem.quantity),
        };
      }
      return item;
    });

    const recordPayload: SimpleUsageRecord = {
      id: editingRecordId || '',
      date: date,
      procedure: procedure.trim(),
      patientConsent,
      patientName: patientConsent ? patientName.trim() : 'Anonymous Patient',
      items: selectedItems.map(si => {
        const item = inventory.find(i => i.id === si.itemId)!;
        return {
          itemId: si.itemId,
          itemName: item.productName,
          quantity: si.quantity,
          unit: item.unit,
        };
      }),
    };

    // Save updates
    try {
      if (editingRecordId) {
        await deleteSimpleUsageRecord(editingRecordId);
      }

      const savedRecord = await createSimpleUsageRecord(recordPayload, getCurrentUser()?.id);
      await saveInventory(updatedInventory);
      setInventory(updatedInventory);

      if (editingRecordId) {
        setUsageHistory([savedRecord, ...usageHistory.filter(r => r.id !== editingRecordId)]);
      } else {
        setUsageHistory([savedRecord, ...usageHistory]);
        sendAdminNotificationEmail(savedRecord);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save usage record.');
      return;
    }

    // Reset form
    setSelectedItems([]);
    setDate(new Date().toISOString().split('T')[0]);
    setProcedure('');
    setPatientConsent(false);
    setPatientName('');
    setEditingRecordId(null);
    setIsModalOpen(false);
  };

  const handleEditUsage = (record: SimpleUsageRecord) => {
    setEditingRecordId(record.id);
    setDate(record.date);
    setProcedure(record.procedure);
    setPatientConsent(record.patientConsent);
    setPatientName(record.patientName === 'Anonymous Patient' || record.patientName.includes('Anonymous') ? '' : record.patientName);
    setSelectedItems(record.items.map(i => ({ itemId: i.itemId, quantity: i.quantity })));
    setIsModalOpen(true);
  };

  const handleDeleteUsage = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this usage record? The used items will be restored to inventory.')) return;

    const recordToDelete = usageHistory.find(r => r.id === recordId);
    if (!recordToDelete) return;

    // Refund inventory
    const updatedInventory = [...inventory];
    recordToDelete.items.forEach(usedItem => {
      const invItem = updatedInventory.find(i => i.id === usedItem.itemId);
      if (invItem) {
        invItem.quantity += usedItem.quantity;
      }
    });

    try {
      await deleteSimpleUsageRecord(recordId);
      await saveInventory(updatedInventory);
      setInventory(updatedInventory);
      setUsageHistory(usageHistory.filter(r => r.id !== recordId));
    } catch (error: any) {
      alert(error.message || 'Failed to delete usage record.');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalItemsUsed = () => {
    return usageHistory.reduce((total, record) => {
      return total + record.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  };

  const getUniqueProductsUsed = () => {
    const uniqueItems = new Set<string>();
    usageHistory.forEach(record => {
      record.items.forEach(item => uniqueItems.add(item.itemId));
    });
    return uniqueItems.size;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usage Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Record items used and view history</p>
        </div>
        <button
          onClick={() => {
            setEditingRecordId(null);
            setSelectedItems([]);
            setDate(new Date().toISOString().split('T')[0]);
            setProcedure('');
            setPatientConsent(false);
            setPatientName('');
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-dark-900 hover:bg-black text-gold-400 px-6 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto font-bold justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Record Usage</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Records</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{usageHistory.length}</p>
            </div>
            <div className="bg-gold-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-gold-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Items Used</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{getTotalItemsUsed()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Unique Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{getUniqueProductsUsed()}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Usage History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Procedure
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items Used
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                {isAdmin && (
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-xs sm:text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-xs sm:text-sm text-gray-900">{record.procedure || 'Not specified'}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-xs sm:text-sm text-gray-900">
                      {record.patientConsent ? record.patientName : 'Anonymous (name hidden)'}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-xs sm:text-sm text-gray-900">
                      {record.items.length} item{record.items.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4">
                    <div className="space-y-1">
                      {record.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          {item.itemName}: {item.quantity} {item.unit}
                        </div>
                      ))}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUsage(record)}
                          className="text-gold-600 hover:text-gold-800 transition p-1 bg-gold-50 rounded-md"
                          title="Edit Usage"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUsage(record.id)}
                          className="text-red-600 hover:text-red-800 transition p-1 bg-red-50 rounded-md"
                          title="Delete Usage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {usageHistory.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No usage records yet
            </div>
          )}
        </div>
      </div>

      {/* Record Usage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-5 sm:p-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl sm:text-2xl font-extrabold text-dark-900 tracking-tight">
                {editingRecordId ? 'Edit Usage Record' : 'Record Usage'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close record usage modal"
                title="Close"
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-dark-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-dark-900 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Usage date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-900 mb-2">
                  Procedure
                </label>
                <input
                  type="text"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  placeholder="e.g., Tooth extraction"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark-900 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientConsent}
                    onChange={(e) => setPatientConsent(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-gold-600 focus:ring-gold-500 cursor-pointer"
                  />
                  Patient consents to recording their name
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={!patientConsent}
                  placeholder={patientConsent ? 'Enter patient name' : 'Name hidden (no consent)'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 text-dark-900 transition-shadow"
                />
                {!patientConsent && (
                  <p className="mt-2 text-xs font-medium text-gray-500">This usage will be saved as Anonymous Patient.</p>
                )}
              </div>

              {/* Selected Items */}
              <div>
                <label className="block text-sm font-semibold text-dark-900 mb-2">
                  Selected Items
                </label>
                <div className="space-y-3 mb-4">
                  {selectedItems.map(({ itemId, quantity }) => {
                    const item = inventory.find(i => i.id === itemId);
                    if (!item) return null;

                    return (
                      <div key={itemId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-dark-900">{item.productName}</p>
                          <p className="text-xs font-medium text-gold-600 mt-0.5">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value))}
                            aria-label={`Quantity for ${item.productName}`}
                            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-gold-500 outline-none"
                          />
                          <span className="text-sm font-medium text-gray-500">{item.unit}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(itemId)}
                          aria-label={`Remove ${item.productName}`}
                          title={`Remove ${item.productName}`}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                  {selectedItems.length === 0 && (
                    <p className="text-sm text-gray-500 italic py-2">No items selected yet.</p>
                  )}
                </div>
              </div>

              {/* Add Items */}
              <div>
                <label className="block text-sm font-semibold text-dark-900 mb-2">
                  Add Items
                </label>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-inner">
                  {filteredInventory.map(item => {
                    const isSelected = selectedItems.some(si => si.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-gold-50 border-l-4 border-l-gold-500' : ''
                        }`}
                        onClick={() => !isSelected && handleAddItem(item.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-dark-900">{item.productName}</p>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-dark-900">{item.quantity} <span className="text-gray-500 font-normal">{item.unit}</span></p>
                            {isSelected && (
                              <p className="text-xs font-bold text-gold-600 mt-0.5">Selected</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-8 py-3 font-bold bg-dark-900 hover:bg-black text-gold-400 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Save Usage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
