import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash, Eye, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  isActive: boolean;
}

interface ProductsProps {
  products: Product[];
  categories: Category[];
  userRole: 'Администратор' | 'Сотрудник';
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Products: React.FC<ProductsProps> = ({ products, categories, userRole, token, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Формы и модальные окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Поля формы
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('шт');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setSku('');
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : null);
    setDescription('');
    setUnit('шт');
    setPurchasePrice(0);
    setRetailPrice(0);
    setStock(0);
    setMinStock(0);
    setImageUrl('');
    setIsActive(true);
    setError(null);
    setSelectedProduct(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategoryId(p.categoryId);
    setDescription(p.description || '');
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setRetailPrice(p.retailPrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setImageUrl(p.imageUrl || '');
    setIsActive(p.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (p: Product) => {
    setSelectedProduct(p);
    setIsDeleteConfirmOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setError('Заполните артикул и наименование товара.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      categoryId: categoryId ? Number(categoryId) : null,
      description: description.trim() || undefined,
      unit: unit.trim() || 'шт',
      purchasePrice: Number(purchasePrice),
      retailPrice: Number(retailPrice),
      stock: selectedProduct ? undefined : Number(stock), // Остаток задаем только при создании, дальше корректировками/закупками
      minStock: Number(minStock),
      imageUrl: imageUrl.trim() || undefined,
      isActive
    };

    try {
      const url = selectedProduct ? `/api/products/${selectedProduct.id}` : '/api/products';
      const method = selectedProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Произошла ошибка при сохранении товара.');
      }

      await onRefresh();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось удалить товар.');
      }

      await onRefresh();
      setIsDeleteConfirmOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Фильтрация и поиск
  const filteredProducts = products
    .filter(p => {
      // Поиск по названию, артикулу или категории
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase()) ||
                          (p.categoryName && p.categoryName.toLowerCase().includes(search.toLowerCase()));
      
      // Фильтр по категории
      const matchCategory = selectedCategory === 'all' || String(p.categoryId) === selectedCategory;

      // Фильтр по активности
      const matchStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && p.isActive) || 
                          (statusFilter === 'inactive' && !p.isActive);

      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'sku') {
        comparison = a.sku.localeCompare(b.sku);
      } else if (sortBy === 'price') {
        comparison = a.retailPrice - b.retailPrice;
      } else if (sortBy === 'stock') {
        comparison = a.stock - b.stock;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'sku' | 'price' | 'stock') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  const isAdmin = userRole === 'Администратор';

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Номенклатура товаров</h1>
          <p className="text-sm text-slate-500">Управление справочником канцелярских товаров, установкой цен и контролем остатков</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-transparent shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> Добавить товар
          </button>
        )}
      </div>

      {/* Панель поиска и фильтров */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Поиск */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию, артикулу или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
          />
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Категория:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none border-none font-semibold cursor-pointer"
            >
              <option value="all">Все категории</option>
              {categories.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-slate-500 font-medium">Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs text-slate-700 outline-none border-none font-semibold cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="inactive">Архивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список товаров в виде таблицы */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                <th className="p-4 cursor-pointer" onClick={() => toggleSort('sku')}>
                  <div className="flex items-center gap-1">
                    Артикул {sortBy === 'sku' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-4 cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">
                    Наименование {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-4">Категория</th>
                <th className="p-4 cursor-pointer text-right" onClick={() => toggleSort('price')}>
                  <div className="flex items-center justify-end gap-1">
                    Розничная цена {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-4 text-right">Закупочная</th>
                <th className="p-4 cursor-pointer text-right" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center justify-end gap-1">
                    Остаток {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-4 text-center">Статус</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 text-sm">
                    Товары не найдены по заданным параметрам.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isLowStock = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40">
                      <td className="p-4 font-mono text-xs text-slate-500">{p.sku}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="h-8 w-8 rounded object-cover border border-slate-200" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.name}</span>
                            {p.description && <span className="text-xs text-slate-500 block max-w-xs truncate">{p.description}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.categoryName || 'Без категории'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold font-mono text-slate-900">
                        {formatPrice(p.retailPrice)}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        {formatPrice(p.purchasePrice)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold font-mono ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {p.stock} {p.unit}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] text-rose-500 flex items-center gap-0.5 font-semibold">
                              <AlertCircle className="h-3 w-3" /> Мин: {p.minStock}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          p.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {p.isActive ? 'Активен' : 'Архив'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title={isAdmin ? "Редактировать товар" : "Посмотреть спецификацию"}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition border border-transparent hover:border-slate-200 cursor-pointer"
                          >
                            {isAdmin ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenDelete(p)}
                              title="Удалить товар"
                              className="p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent text-slate-400 transition cursor-pointer"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно редактирования/создания */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950 font-display">
                {selectedProduct ? (isAdmin ? 'Редактировать товар' : 'Просмотр спецификации') : 'Создать товар'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Артикул *</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="E.g., SK-1001"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Наименование *</label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ручка гелевая синяя"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Категория</label>
                  <select
                    disabled={!isAdmin}
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none bg-white transition disabled:bg-slate-50"
                  >
                    <option value="">Без категории</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Единица измерения</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="шт, уп, коробка"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Закупочная цена (₽) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={!isAdmin}
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Розничная цена (₽) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={!isAdmin}
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {selectedProduct ? 'Текущий остаток' : 'Начальный остаток'}
                  </label>
                  <input
                    type="number"
                    required
                    // Остаток при редактировании менять только через документы склада (корректировки / приходы)
                    disabled={!!selectedProduct || !isAdmin}
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Минимальный порог остатка</label>
                  <input
                    type="number"
                    required
                    disabled={!isAdmin}
                    value={minStock}
                    onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Описание</label>
                <textarea
                  disabled={!isAdmin}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Дополнительная информация о характеристиках канцелярского товара..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ссылка на изображение (опционально)</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/product.jpg"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition disabled:bg-slate-50"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-slate-900 border-slate-200 rounded focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    Активный статус (показывается в поиске и доступен к продаже)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                >
                  {isAdmin ? 'Отмена' : 'Закрыть'}
                </button>
                {isAdmin && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Окно подтверждения удаления */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-950 font-display">Удаление товара</h2>
            <p className="text-sm text-slate-500">
              Вы уверены, что хотите окончательно удалить товар <span className="font-semibold text-slate-900">"{selectedProduct?.name}"</span>? Это действие необратимо и возможно только если по товару нет движений на складе.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
