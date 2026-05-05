import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, User, Calendar, FileText, CheckCircle, Package } from 'lucide-react';
import { InventoryItem, UsageRecord, UsageItem } from '../types';
import { getInventory, saveInventory } from '../services/inventoryService';
import { getCurrentUser } from '../services/authService';
import { createPatientUsageRecord, getPatientUsageHistory } from '../services/patientService';
import { toast } from 'sonner';

export function PatientUsagePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [patientConsent, setPatientConsent] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [procedure, setProcedure] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<UsageItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const load = async () => {
      setInventory(await getInventory());
      setUsageHistory(await getPatientUsageHistory());
    };

    load().catch((error) => toast.error(error.message || 'Failed to load patient usage data.'));
  }, []);

  const addItemRow = () => {
    setSelectedItems([
      ...selectedItems,
      {
        productId: '',
        productName: '',
        quantityUsed: 0,
        unit: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof UsageItem, value: string | number) => {
    const updated = [...selectedItems];
    if (field === 'productId') {
      const product = inventory.find(item => item.id === value);
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: product.id,
          productName: product.productName,
          unit: product.unit,
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!patientConsent) {
      toast.error('Patient consent is required to record their name');
      return;
    }

    if (!patientName.trim() || !patientId.trim()) {
      toast.error('Please enter patient name and ID');
      return;
    }

    if (!procedure.trim()) {
      toast.error('Please enter the procedure');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    if (selectedItems.some(item => !item.productId || item.quantityUsed <= 0)) {
      toast.error('Please complete all item details');
      return;
    }

    // Check if there's enough stock
    const insufficientStock = selectedItems.find(item => {
      const product = inventory.find(p => p.id === item.productId);
      return product && product.quantity < item.quantityUsed;
    });

    if (insufficientStock) {
      const product = inventory.find(p => p.id === insufficientStock.productId);
      toast.error(`Insufficient stock for ${product?.productName}. Available: ${product?.quantity} ${product?.unit}`);
      return;
    }

    // Update inventory
    const updatedInventory = inventory.map(item => {
      const usedItem = selectedItems.find(si => si.productId === item.id);
      if (usedItem) {
        return {
          ...item,
          quantity: item.quantity - usedItem.quantityUsed,
        };
      }
      return item;
    });

    const user = getCurrentUser();

    try {
      const newRecord = await createPatientUsageRecord({
        patientConsent,
        patientName,
        procedure: procedure.trim(),
        recordedByUserId: user?.id,
        items: selectedItems,
      });

      await saveInventory(updatedInventory);
      setUsageHistory([newRecord, ...usageHistory]);
      setInventory(updatedInventory);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save usage record.');
      return;
    }

    // Reset form
    setPatientConsent(false);
    setPatientName('');
    setPatientId('');
    setProcedure('');
    setNotes('');
    setSelectedItems([]);

    toast.success('Usage recorded successfully!');
  };

  const getTotalItemsUsed = (record: UsageRecord) => {
    return record.items.reduce((sum, item) => sum + item.quantityUsed, 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patient Usage Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Record items used during patient visits</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition w-full sm:w-auto justify-center"
        >
          <FileText className="w-5 h-5" />
          <span>{showHistory ? 'Hide History' : 'Show History'}</span>
        </button>
      </div>

      {/* Usage Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Record New Usage</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Patient Information */}
          <div className="space-y-4">
            <label className="flex items-start sm:items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={patientConsent}
                onChange={(e) => setPatientConsent(e.target.checked)}
                className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500"
              />
              <span>I confirm the patient consents to their name being recorded.</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label htmlFor="patientName" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Patient Name
              </label>
              <input
                type="text"
                id="patientName"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={!patientConsent}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none text-sm sm:text-base"
                placeholder="Enter patient name"
              />
            </div>

            <div>
              <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Patient ID
              </label>
              <input
                type="text"
                id="patientId"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={!patientConsent}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none text-sm sm:text-base"
                placeholder="Enter patient ID"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="procedure" className="block text-sm font-medium text-gray-700 mb-2">
                Procedure
              </label>
              <input
                type="text"
                id="procedure"
                required
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                disabled={!patientConsent}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none text-sm sm:text-base"
                placeholder="Enter performed procedure"
              />
            </div>
            </div>
          </div>

          {/* Items Used */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Items Used
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center space-x-2 bg-gold-600 hover:bg-gold-700 text-white px-3 py-1.5 rounded-lg transition text-sm w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm sm:text-base">No items added yet</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Click "Add Item" to start recording usage</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((item, index) => (
                  <div key={index} className="flex flex-col gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Product</label>
                        <select
                          aria-label={`Select product for item ${index + 1}`}
                          value={item.productId}
                          onChange={(e) => updateItemRow(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none bg-white text-sm"
                          required
                        >
                          <option value="">Select a product</option>
                          {inventory.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.productName} ({product.quantity} {product.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 sm:w-32">
                          <label className="block text-xs text-gray-600 mb-1">Quantity Used</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantityUsed || ''}
                            onChange={(e) => updateItemRow(index, 'quantityUsed', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none text-sm"
                            placeholder="0"
                            required
                          />
                        </div>

                        {item.unit && (
                          <div className="w-20 sm:w-24">
                            <label className="block text-xs text-gray-600 mb-1">Unit</label>
                            <div className="px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-700 text-center text-sm">
                              {item.unit}
                            </div>
                          </div>
                        )}

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            title={`Remove item ${index + 1}`}
                            aria-label={`Remove item ${index + 1}`}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none resize-none text-sm sm:text-base"
              placeholder="Add any additional notes about the procedure or usage..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={selectedItems.length === 0}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition font-medium w-full sm:w-auto justify-center text-sm sm:text-base"
            >
              <Save className="w-5 h-5" />
              <span>Record Usage & Update Inventory</span>
            </button>
          </div>
        </form>
      </div>

      {/* Usage History */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Usage History</h2>
          </div>

          {usageHistory.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm sm:text-base">No usage records yet</p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Start recording patient visits to see history here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {usageHistory.map((record) => (
                <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{record.patientName}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          ID: {record.patientId}
                        </span>
                        <span>
                          Procedure: {record.procedure || 'Not specified'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(record.date).toLocaleString()}
                        </span>
                        <span className="hidden sm:inline">
                          Recorded by: {record.recordedBy}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gold-100 text-gold-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                      {getTotalItemsUsed(record)} items used
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Items Used:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {record.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                          <span className="text-xs sm:text-sm text-gray-900">{item.productName}</span>
                          <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap ml-2">
                            {item.quantityUsed} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    {record.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
