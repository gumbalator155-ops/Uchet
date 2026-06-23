import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUpRight, ArrowDownLeft, Clipboard, Settings, Search, SlidersHorizontal, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface Product {
  id: number;
  sku: string;
  name: string;
  categoryName: string | null;
  stock: number;
  unit: string;
}

interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  docNumber: string | null;
  comment: string | null;
  date: string;
}

interface WarehouseProps {
  products: Product[];
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Warehouse: React.FC<WarehouseProps> = ({ products, token, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');

  // Фильтры истории
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedProductHistory, setSelectedProductHistory] = useState<string>('all');

  // Форма корректировки/инвентаризации
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'Корректировка' | 'Инвентаризация'>('Корректировка');
  const [newStock, setNewStock] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/stock-movements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории движения товаров:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleOpenAdjust = (p: Product) => {
    setSelectedProduct(p);
    setNewStock(p.stock);
    setAdjustType('Корректировка');
    setComment('');
    setError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      productId: selectedProduct.id,
      type: adjustType,
      newStock: Number(newStock),
      comment: comment.trim() || undefined
    };

    try {
      const res = await fetch('/api/stock-movements/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось выполнить корректировку.');
      }

      await onRefresh();
      if (activeTab === 'history') {
        await fetchHistory();
      }
      setIsAdjustModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Фильтрация текущих остатков
  const filteredInventory = products.filter(p => {
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || 
           p.sku.toLowerCase().includes(s) || 
           (p.categoryName && p.categoryName.toLowerCase().includes(s));
  });

  // Фильтрация истории движения
  const filteredHistory = movements.filter(m => {
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchProduct = selectedProductHistory === 'all' || String(m.productId) === selectedProductHistory;
    return matchType && matchProduct;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Складской учет</h1>
          <p className="text-sm text-slate-500">Управление текущими остатками товаров, корректировка брака/излишков и инвентаризация</p>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Текущие остатки
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            История движения
          </button>
        </div>
      </div>

      {/* Контент: Вкладка "Текущие остатки" */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Быстрый поиск товаров на складе..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Показано позиций: {filteredInventory.length} из {products.length}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Артикул</th>
                    <th className="p-4">Наименование</th>
                    <th className="p-4">Категория</th>
                    <th className="p-4 text-right">Текущий остаток</th>
                    <th className="p-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        Товары не найдены.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="p-4 font-mono text-xs text-slate-500">{p.sku}</td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {p.categoryName || 'Без категории'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-slate-800">
                          {p.stock} {p.unit}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                          >
                            <SlidersHorizontal className="h-3 w-3" /> Корректировка / Инвентаризация
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Контент: Вкладка "История движения" */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-wrap items-center gap-4">
            {/* Сортировка по типу */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Тип операции:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 outline-none border-none font-semibold cursor-pointer"
              >
                <option value="all">Все движения</option>
                <option value="Приход">Приход (Поступление)</option>
                <option value="Расход">Расход (Продажи)</option>
                <option value="Корректировка">Корректировки</option>
                <option value="Инвентаризация">Инвентаризации</option>
              </select>
            </div>

            {/* Фильтр по товару */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">По товару:</span>
              <select
                value={selectedProductHistory}
                onChange={(e) => setSelectedProductHistory(e.target.value)}
                className="bg-transparent text-xs text-slate-700 outline-none border-none font-semibold cursor-pointer max-w-[200px]"
              >
                <option value="all">Все товары</option>
                {products.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition ml-auto cursor-pointer"
              title="Обновить историю"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {loadingHistory ? (
              <div className="text-center py-12 text-sm text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-slate-400" /> Загрузка истории...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Товар / Артикул</th>
                      <th className="p-4">Операция</th>
                      <th className="p-4 text-right">Количество</th>
                      <th className="p-4 text-right">Было</th>
                      <th className="p-4 text-right">Стало</th>
                      <th className="p-4">Документ</th>
                      <th className="p-4">Комментарий</th>
                      <th className="p-4">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          История движений пуста или нет подходящих записей.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/40 text-xs">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900">{m.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">{m.productSku}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              m.type === 'Приход' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              m.type === 'Расход' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              m.type === 'Инвентаризация' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {m.type === 'Приход' && <ArrowUpRight className="h-3 w-3" />}
                              {m.type === 'Расход' && <ArrowDownLeft className="h-3 w-3" />}
                              {m.type === 'Инвентаризация' && <Clipboard className="h-3 w-3" />}
                              {m.type === 'Корректировка' && <Settings className="h-3 w-3" />}
                              {m.type}
                            </span>
                          </td>
                          <td className={`p-4 text-right font-bold font-mono ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-500">{m.previousStock}</td>
                          <td className="p-4 text-right font-mono text-slate-900 font-semibold">{m.newStock}</td>
                          <td className="p-4 text-slate-600 font-mono text-xs">{m.docNumber || '—'}</td>
                          <td className="p-4 text-slate-500 italic max-w-xs truncate" title={m.comment || ''}>
                            {m.comment || '—'}
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDate(m.date)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно Корректировки / Инвентаризации */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950 font-display">Корректировка запасов</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                <div className="text-slate-400 font-semibold uppercase tracking-wider">Товар</div>
                <div className="font-bold text-slate-900 text-sm">{selectedProduct.name}</div>
                <div className="text-slate-500 font-mono">Артикул: {selectedProduct.sku}</div>
                <div className="text-slate-600 mt-1">Текущий остаток на складе: <span className="font-bold">{selectedProduct.stock} {selectedProduct.unit}</span></div>
              </div>

              {/* Выбор вида операции */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Вид операции</label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAdjustType('Корректировка')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                      adjustType === 'Корректировка' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Корректировка (Списание/Оприходование)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('Инвентаризация')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                      adjustType === 'Инвентаризация' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Инвентаризация (Сверка)
                  </button>
                </div>
              </div>

              {/* Новый остаток */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Фактический новый остаток *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">{selectedProduct.unit}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Разница составит: <span className={`font-semibold ${newStock - selectedProduct.stock >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {newStock - selectedProduct.stock >= 0 ? `+${newStock - selectedProduct.stock}` : newStock - selectedProduct.stock} {selectedProduct.unit}
                  </span>
                </div>
              </div>

              {/* Комментарий */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Причина / Комментарий</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={adjustType === 'Инвентаризация' ? 'E.g., Сверка остатков по результатам ежемесячной ревизии' : 'E.g., Выявлен брак, порча упаковки или излишки'}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Проведение...' : 'Провести операцию'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Простой X иконка, чтобы избежать ошибок компиляции если импорт отсутствует
const X: React.FC<any> = ({ className }) => <span className={`text-slate-400 hover:text-slate-600 cursor-pointer ${className}`}>✕</span>;
