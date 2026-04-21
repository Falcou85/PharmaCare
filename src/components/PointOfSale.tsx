import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  X,
  Check
} from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  generic_name: string;
  form: string;
  strength: string;
  price: number;
  available_quantity: number;
  inventory_id: string;
}

interface CartItem extends Medication {
  quantity: number;
  subtotal: number;
}

export function PointOfSale() {
  const { profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance'>('cash');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (search.length > 1) {
      searchMedications();
    } else {
      setMedications([]);
    }
  }, [search]);

  const searchMedications = async () => {
    setLoading(true);
    try {
      const { data: inventoryData, error } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity,
          medication:medications(
            id,
            name,
            generic_name,
            form,
            strength
          )
        `)
        .gt('quantity', 0)
        .limit(10);

      if (error) throw error;

      const medicationsWithPricing = await Promise.all(
        (inventoryData || []).map(async (item: any) => {
          const medName = item.medication?.name?.toLowerCase() || '';
          if (!search || medName.includes(search.toLowerCase())) {
            const { data: pricingData } = await supabase
              .from('pricing')
              .select('selling_price')
              .eq('medication_id', item.medication.id)
              .eq('is_active', true)
              .maybeSingle();

            return {
              id: item.medication.id,
              name: item.medication.name,
              generic_name: item.medication.generic_name,
              form: item.medication.form,
              strength: item.medication.strength,
              price: pricingData?.selling_price || 0,
              available_quantity: item.quantity,
              inventory_id: item.id,
            };
          }
          return null;
        })
      );

      setMedications(medicationsWithPricing.filter(m => m !== null) as Medication[]);
    } catch (error) {
      console.error('Error searching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (medication: Medication) => {
    const existingItem = cart.find(item => item.id === medication.id);

    if (existingItem) {
      if (existingItem.quantity < medication.available_quantity) {
        updateQuantity(medication.id, existingItem.quantity + 1);
      }
    } else {
      const cartItem: CartItem = {
        ...medication,
        quantity: 1,
        subtotal: medication.price,
      };
      setCart([...cart, cartItem]);
    }
    setSearch('');
    setMedications([]);
  };

  const updateQuantity = (medicationId: string, newQuantity: number) => {
    const medication = medications.find(m => m.id === medicationId) ||
                      cart.find(c => c.id === medicationId);

    if (!medication || newQuantity > medication.available_quantity || newQuantity < 1) {
      return;
    }

    setCart(cart.map(item =>
      item.id === medicationId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (medicationId: string) => {
    setCart(cart.filter(item => item.id !== medicationId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = (subtotal * discount) / 100;
    const tax = (subtotal - discountAmount) * 0.1;
    const total = subtotal - discountAmount + tax;

    return { subtotal, discountAmount, tax, total };
  };

  const completeSale = async () => {
    if (cart.length === 0) return;

    setProcessing(true);
    try {
      const totals = calculateTotals();
      const saleNumber = `SALE-${Date.now()}`;

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          total_amount: totals.subtotal,
          discount: totals.discountAmount,
          tax: totals.tax,
          net_amount: totals.total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          served_by: profile?.id,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        medication_id: item.id,
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.price,
        discount: 0,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        const { data: currentInventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.inventory_id)
          .single();

        if (currentInventory) {
          await supabase
            .from('inventory')
            .update({ quantity: currentInventory.quantity - item.quantity })
            .eq('id', item.inventory_id);
        }
      }

      const transactionNumber = `TXN-${Date.now()}`;
      await supabase.from('transactions').insert([{
        transaction_number: transactionNumber,
        type: 'income',
        category: 'sales',
        amount: totals.total,
        description: `Sale ${saleNumber}`,
        reference_type: 'sale',
        reference_id: saleData.id,
        date: new Date().toISOString().split('T')[0],
        created_by: profile?.id,
      }]);

      setCart([]);
      setDiscount(0);
      setShowCheckout(false);
      alert(`Sale completed successfully! Total: $${totals.total.toFixed(2)}`);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Failed to complete sale. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">Point of Sale</h1>
        <p className="text-gray-600 dark:text-slate-400">Scan or search for medications to add to cart</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medications by name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loading && (
              <div className="mt-4 text-center text-gray-500 dark:text-slate-400">Searching...</div>
            )}

            {medications.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => addToCart(med)}
                    className="p-4 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-slate-100">{med.name}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {med.form} - {med.strength}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                          Available: {med.available_quantity}
                        </p>
                      </div>
                      <p className="font-bold text-blue-600">${med.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Cart Items</h2>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">{item.form} - {item.strength}</p>
                      <p className="text-sm text-blue-600">${item.price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-slate-100">${item.subtotal.toFixed(2)}</p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-slate-400">Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-slate-700 rounded text-right"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-600 dark:text-slate-400">%</span>
                </div>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount Amount</span>
                  <span>-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600 dark:text-slate-400">
                <span>Tax (10%)</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>

              <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-800 dark:text-slate-100">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Payment</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">Select Payment Method</p>
              <div className="space-y-2">
                {[
                  { value: 'cash', label: 'Cash', icon: Banknote },
                  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
                  { value: 'insurance', label: 'Insurance', icon: ShoppingCart },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value as any)}
                    className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition ${
                      paymentMethod === value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="font-medium">{label}</span>
                    {paymentMethod === value && (
                      <Check className="w-5 h-5 ml-auto text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-slate-400">Total Amount</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                  ${totals.total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={completeSale}
              disabled={processing}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
