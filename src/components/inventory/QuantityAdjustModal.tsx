import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { InventoryItem } from '../../types';

interface QuantityAdjustModalProps {
  item: InventoryItem;
  onSave: (item: InventoryItem, newQuantity: number) => void;
  onClose: () => void;
}

export function QuantityAdjustModal({ item, onSave, onClose }: QuantityAdjustModalProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity !== item.quantity) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    onSave(item, quantity);
    setShowConfirmation(false);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 border border-gray-100">
          <div className="flex justify-between items-center p-5 sm:p-7 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-extrabold text-dark-900 tracking-tight">
              Adjust Quantity
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-dark-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Product</p>
              <p className="font-bold text-xl text-dark-900">{item.productName}</p>
              <p className="text-sm text-gold-600 font-medium mt-1">{item.category}</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-sm font-bold text-dark-900 mb-4 text-center">
                Current Quantity: <span className="text-gold-600">{item.quantity} {item.unit}</span>
              </label>
              
              <div className="flex items-center justify-center space-x-6">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="p-4 bg-white shadow-sm hover:shadow-md border border-gray-200 hover:border-red-300 hover:bg-red-50 text-red-500 rounded-2xl transition-all hover:-translate-y-0.5"
                >
                  <Minus className="w-6 h-6" />
                </button>
                
                <div className="text-center relative">
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                    className="w-28 text-center text-3xl font-extrabold px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500 outline-none text-dark-900 shadow-sm"
                  />
                  <p className="text-sm font-bold text-gray-400 mt-2 absolute -bottom-6 left-1/2 -translate-x-1/2">{item.unit}</p>
                </div>
                
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="p-4 bg-white shadow-sm hover:shadow-md border border-gray-200 hover:border-green-300 hover:bg-green-50 text-green-500 rounded-2xl transition-all hover:-translate-y-0.5"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {quantity !== item.quantity && (
                <div className="mt-8 p-4 bg-gold-50 border border-gold-100 rounded-xl text-center animate-in slide-in-from-bottom-2">
                  <p className="text-sm font-medium text-gold-900">
                    {quantity > item.quantity ? (
                      <>Adding <strong className="text-gold-600 text-lg">+{quantity - item.quantity}</strong> {item.unit}</>
                    ) : (
                      <>Removing <strong className="text-orange-600 text-lg">-{item.quantity - quantity}</strong> {item.unit}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 font-bold bg-dark-900 hover:bg-black text-gold-400 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                Update Quantity
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 animate-in zoom-in-95">
            <h3 className="text-xl font-extrabold text-dark-900 mb-4">Confirm Change</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Update quantity for <strong className="text-dark-900">{item.productName}</strong> from{' '}
              <strong className="text-dark-900">{item.quantity}</strong> to <strong className="text-gold-600 text-lg">{quantity}</strong> {item.unit}?
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-3 font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-3 font-bold bg-gold-500 hover:bg-gold-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 w-full sm:w-auto"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
