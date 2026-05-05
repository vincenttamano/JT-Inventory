import { useState, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { InventoryItem } from '../../types';
import { getCategories, saveCustomCategory } from '../../services/categoryService';

interface InventoryItemModalProps {
  item: InventoryItem | null;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}

export function InventoryItemModal({ item, onSave, onClose }: InventoryItemModalProps) {
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    productName: '',
    quantity: 0,
    unit: 'pieces',
    expiryDate: '',
    category: 'Consumables',
    lowStockThreshold: 10,
    price: 0,
    dateCreated: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        category: item.category,
        lowStockThreshold: item.lowStockThreshold,
        price: item.price || 0,
        dateCreated: item.dateCreated,
      });
      setCategories((prev) =>
        prev.includes(item.category) ? prev : [...prev, item.category]
      );
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: item?.id || '',
      dateCreated: item?.dateCreated || new Date().toISOString().split('T')[0],
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'lowStockThreshold' 
        ? parseInt(value, 10) || 0
        : name === 'price' 
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, category: trimmed }));
    } else {
      const updated = [...categories, trimmed];
      setCategories(updated);
      saveCustomCategory(trimmed);
      setFormData((prev) => ({ ...prev, category: trimmed }));
    }
    setNewCategoryName('');
    setAddingCategory(false);
  };

  return (
    <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="flex justify-between items-center p-5 sm:p-7 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl sm:text-2xl font-extrabold text-dark-900 tracking-tight">
            {item ? 'Edit Inventory Item' : 'Add New Item'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-dark-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Product Name */}
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="productName" className="block text-sm font-semibold text-dark-900 mb-2">
                Product Name
              </label>
              <input
                type="text"
                id="productName"
                name="productName"
                required
                value={formData.productName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
                placeholder="e.g. Anesthetic Solution"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-dark-900 mb-2">
                Category
              </label>

              {!addingCategory ? (
                <div className="flex gap-2">
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none appearance-none text-dark-900 transition-shadow"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAddingCategory(true)}
                    title="Add new category"
                    className="flex items-center gap-1 px-4 py-3 bg-gold-50 hover:bg-gold-100 border border-gold-200 text-gold-700 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                        if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                      }}
                      placeholder="Custom category…"
                      className="w-full pl-9 pr-3 py-3 bg-white border border-gold-400 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-3 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}
                    className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-semibold text-dark-900 mb-2">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                required
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
              />
            </div>

            {/* Unit */}
            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-dark-900 mb-2">
                Unit Measure
              </label>
              <select
                id="unit"
                name="unit"
                required
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none appearance-none text-dark-900 transition-shadow"
              >
                {['pieces', 'boxes', 'bottles', 'syringes', 'packs', 'tubes', 'kg', 'liters'].map((u) => (
                  <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Expiry Date */}
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-semibold text-dark-900 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                required
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
              />
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label htmlFor="lowStockThreshold" className="block text-sm font-semibold text-dark-900 mb-2">
                Alert Threshold (Low Stock)
              </label>
              <input
                type="number"
                id="lowStockThreshold"
                name="lowStockThreshold"
                required
                min="0"
                value={formData.lowStockThreshold}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-dark-900 mb-2">
                Unit Price (₱)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none text-dark-900 transition-shadow"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 font-bold bg-dark-900 hover:bg-black text-gold-400 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
