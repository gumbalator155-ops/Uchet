import React, { useState } from 'react';
import { Plus, Trash, Save, Eye, Clipboard, Calendar, ShoppingCart, ChevronDown, ChevronUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  retailPrice: number;
  stock: number;
}

interface SaleItem {
  id?: number;
  productId: number;
  productName?: string;
  productSku?: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: number;
  docNumber: string;
  date: string;
  employeeName: string;
  totalAmount: number;
  items: SaleItem[];
}

interface SalesProps {
  sales: Sale[];
  products: Product[];
  currentUserName: string;
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Sales: React.FC<SalesProps> = ({ sales, products, currentUserName, token, onRefresh }) => {
  const [activeView, setActiveView] = useState<'journal' | 'new'>('journal');
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

  // Поля нового документа
  const [docNumber, setDocNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeName, setEmployeeName] = useState(currentUserName || '');

  // Добавление позиций в продажу
  const [items, setItems] = useState<SaleItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<number>(0);
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [selectedProductStock, setSelectedProductStock] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Синхронизировать имя текущего пользователя, когда оно меняется
  React.useEffect(() => {
    if (currentUserName && !employeeName) {
      setEmployeeName(currentUserName);
    }
  }, [currentUserName]);

  // Выбор товара
  const handleProductChange = (id: number) => {
    setCurrentProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setCurrentPrice(prod.retailPrice);
      setSelectedProductStock(prod.stock);
    } else {
      setSelectedProductStock(0);
    }
  };

  // Инициализировать цену при открытии формы
  React.useEffect(() => {
    if (products.length > 0 && currentProductId === 0) {
      handleProductChange(products[0].id);
    }
  }, [products]);

  const handleAddItem = () => {
    if (currentProductId === 0) return;
    
    const prod = products.find(p => p.id === currentProductId);
    if (!prod) return;

    // Проверка лимитов наличия на складе
    const existing = items.find(item => item.productId === currentProductId);
    const addedQty = existing ? existing.quantity : 0;
    const targetQty = addedQty + currentQuantity;

    if (targetQty > prod.stock) {
      setError(`Недостаточно товара на складе. В наличии: ${prod.stock} шт.`);
      return;
    }

    setError(null);

    if (existing) {
      // Обновляем количество
      const updated = items.map(item => {
        if (item.productId === currentProductId) {
          return { ...item, quantity: targetQty, price: currentPrice };
        }
        return item;
      });
      setItems(updated);
    } else {
      setItems([...items, {
        productId: currentProductId,
        productName: prod.name,
        productSku: prod.sku,
        quantity: currentQuantity,
        price: currentPrice
      }]);
    }

    // Сброс
    setCurrentQuantity(1);
    // Обновим остаток с учетом зарезервированного в чеке
    setSelectedProductStock(prod.stock - targetQty);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    // При удалении восстановим селектор остатка
    if (products.length > 0) {
      const prod = products.find(p => p.id === currentProductId);
      if (prod) {
        const itemInCart = items.filter((_, i) => i !== index).find(it => it.productId === currentProductId);
        setSelectedProductStock(prod.stock - (itemInCart ? itemInCart.quantity : 0));
      }
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setError('Укажите номер продажи (чека).');
      return;
    }
    if (!employeeName.trim()) {
      setError('Укажите ФИО сотрудника оформившего продажу.');
      return;
    }
    if (items.length === 0) {
      setError('Список товаров пуст.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      docNumber: docNumber.trim(),
      date,
      employeeName: employeeName.trim(),
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось провести продажу.');
      }

      await onRefresh();
      // Очистка формы
      setDocNumber('');
      setItems([]);
      setActiveView('journal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleExpand = (docId: number) => {
    setExpandedDoc(expandedDoc === docId ? null : docId);
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Продажи (POS-терминал)</h1>
          <p className="text-sm text-slate-500">Оформление розничных продаж канцелярских принадлежностей с автоматическим списанием остатков</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
          <button
            onClick={() => setActiveView('journal')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeView === 'journal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Журнал продаж
          </button>
          <button
            onClick={() => {
              setActiveView('new');
              // Предустановка номера продажи
              setDocNumber(`ЧК-${Math.floor(100000 + Math.random() * 900000)}`);
              setError(null);
            }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeView === 'new' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Новая продажа
          </button>
        </div>
      </div>

      {/* Журнал продаж */}
      {activeView === 'journal' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-10"></th>
                  <th className="p-4">Номер чека</th>
                  <th className="p-4">Дата</th>
                  <th className="p-4">Продавец (Сотрудник)</th>
                  <th className="p-4 text-right">Сумма продажи</th>
                  <th className="p-4 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      Журнал продаж пуст. Оформите первую продажу в магазине!
                    </td>
                  </tr>
                ) : (
                  sales.map(sale => {
                    const isExpanded = expandedDoc === sale.id;
                    return (
                      <React.Fragment key={sale.id}>
                        <tr className="hover:bg-slate-50/20 cursor-pointer" onClick={() => toggleExpand(sale.id)}>
                          <td className="p-4 text-center text-slate-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </td>
                          <td className="p-4 font-bold font-mono text-slate-900">{sale.docNumber}</td>
                          <td className="p-4 text-slate-500 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> {formatDate(sale.date)}
                          </td>
                          <td className="p-4 text-slate-700 font-semibold">{sale.employeeName}</td>
                          <td className="p-4 text-right font-bold text-slate-900 font-mono">
                            {formatPrice(sale.totalAmount)}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle className="h-3 w-3" /> Оплачен / Выдан
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={6} className="p-4 border-t border-b border-slate-100">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Clipboard className="h-3.5 w-3.5" /> Спецификация чека {sale.docNumber}
                                </h4>
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                                      <th className="pb-2">Товар</th>
                                      <th className="pb-2">Артикул</th>
                                      <th className="pb-2 text-right">Количество</th>
                                      <th className="pb-2 text-right">Цена продажи</th>
                                      <th className="pb-2 text-right">Сумма</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {sale.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="py-2 font-semibold text-slate-900">{item.productName}</td>
                                        <td className="py-2 font-mono text-slate-500">{item.productSku}</td>
                                        <td className="py-2 text-right font-mono text-slate-800">{item.quantity} шт</td>
                                        <td className="py-2 text-right font-mono text-slate-600">{formatPrice(item.price)}</td>
                                        <td className="py-2 text-right font-bold font-mono text-slate-900">{formatPrice(item.quantity * item.price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Оформление новой продажи */}
      {activeView === 'new' && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Левая колонка: параметры продажи */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-4 space-y-4 h-fit">
            <h2 className="text-base font-bold text-slate-950 font-display border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-slate-500" /> Продажа / Чек
            </h2>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Номер чека *</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="ЧК-100293"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Дата продажи *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Сотрудник (Оформил) *</label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="ФИО сотрудника"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Товаров в чеке:</span>
                <span className="font-semibold text-slate-800">{items.reduce((sum, item) => sum + item.quantity, 0)} шт.</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span className="text-slate-900">Итого к оплате:</span>
                <span className="text-emerald-600 font-mono">{formatPrice(calculateTotal())}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveView('journal')}
                className="flex-1 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" /> {submitting ? 'Оформление...' : 'Оплатить'}
              </button>
            </div>
          </div>

          {/* Правая колонка: корзина продажи */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-8 space-y-5 flex flex-col">
            <h2 className="text-base font-bold text-slate-950 font-display border-b border-slate-100 pb-2">
              Корзина товаров
            </h2>

            {/* Добавление строки */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="md:col-span-5 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Канцелярский товар *</label>
                <select
                  value={currentProductId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition cursor-pointer"
                >
                  <option value={0} disabled>Выберите товар...</option>
                  {products.filter(p => p.stock > 0).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) [остаток: {p.stock}]</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Количество *</label>
                <input
                  type="number"
                  min={1}
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Розничная цена *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> В чек
                </button>
              </div>
            </div>

            {/* Таблица текущих строк */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="pb-2">Товар / Артикул</th>
                    <th className="pb-2 text-right">Количество</th>
                    <th className="pb-2 text-right">Цена продажи</th>
                    <th className="pb-2 text-right">Сумма</th>
                    <th className="pb-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Корзина пуста. Добавьте канцелярские принадлежности для продажи.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 text-xs">
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-950">{item.productName}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{item.productSku}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">{item.quantity} шт</td>
                        <td className="py-2.5 text-right font-mono text-slate-600">{formatPrice(item.price)}</td>
                        <td className="py-2.5 text-right font-bold font-mono text-slate-900">
                          {formatPrice(item.quantity * item.price)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
