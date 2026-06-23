import React, { useState } from 'react';
import { Plus, Edit, Trash, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
}

interface CategoriesProps {
  categories: Category[];
  products: Product[];
  userRole: 'Администратор' | 'Сотрудник';
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Categories: React.FC<CategoriesProps> = ({ categories, products, userRole, token, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userRole === 'Администратор';

  const resetForm = () => {
    setName('');
    setDescription('');
    setError(null);
    setSelectedCategory(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    setSelectedCategory(cat);
    setIsDeleteOpen(true);
  };

  const getProductCount = (catId: number) => {
    return products.filter(p => p.categoryId === catId).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Наименование категории обязательно для заполнения.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined
    };

    try {
      const url = selectedCategory ? `/api/categories/${selectedCategory.id}` : '/api/categories';
      const method = selectedCategory ? 'PUT' : 'POST';

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
        throw new Error(errData.error || 'Не удалось сохранить категорию.');
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
    if (!selectedCategory) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось удалить категорию.');
      }

      await onRefresh();
      setIsDeleteOpen(false);
      setSelectedCategory(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Категории канцелярских товаров</h1>
          <p className="text-sm text-slate-500">Систематизация товаров по категориям для удобства поиска, закупа и фильтрации</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-transparent shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> Добавить категорию
          </button>
        )}
      </div>

      {/* Список категорий */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            Категории отсутствуют. Добавьте первую категорию (например: Ручки, Бумага, Карандаши).
          </div>
        ) : (
          categories.map(cat => {
            const count = getProductCount(cat.id);
            return (
              <motion.div
                key={cat.id}
                whileHover={{ y: -1 }}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 font-display text-base">{cat.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Товаров: {count}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 min-h-[40px] line-clamp-2">
                    {cat.description || 'Описание категории не заполнено.'}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleOpenDelete(cat)}
                      disabled={count > 0}
                      title={count > 0 ? "Нельзя удалить категорию, к которой привязаны товары" : "Удалить категорию"}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Модальное окно создания/редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950 font-display">
                {selectedCategory ? 'Редактировать категорию' : 'Создать категорию'}
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

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Наименование категории *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Бумага офисная, Ручки"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Дополнительное описание канцелярских принадлежностей данной группы..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Модальное окно удаления */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-950 font-display">Удаление категории</h2>
            <p className="text-sm text-slate-500">
              Вы уверены, что хотите окончательно удалить категорию <span className="font-semibold text-slate-900">"{selectedCategory?.name}"</span>? Действие невозможно отменить.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
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
