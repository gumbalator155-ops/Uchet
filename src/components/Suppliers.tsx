import React, { useState } from 'react';
import { Plus, Edit, Phone, Mail, MapPin, ClipboardList, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Supplier {
  id: number;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  comment: string | null;
  createdAt: string;
}

interface Purchase {
  id: number;
  docNumber: string;
  date: string;
  supplierId: number | null;
  totalAmount: number;
}

interface SuppliersProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Suppliers: React.FC<SuppliersProps> = ({ suppliers, purchases, token, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Форма поставщика
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setComment('');
    setError(null);
    setSelectedSupplier(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setCompanyName(sup.companyName);
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setComment(sup.comment || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setIsHistoryOpen(true);
  };

  const getSuppliesForSupplier = (supId: number) => {
    return purchases.filter(p => p.supplierId === supId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Укажите название компании-поставщика.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      comment: comment.trim() || undefined
    };

    try {
      const url = selectedSupplier ? `/api/suppliers/${selectedSupplier.id}` : '/api/suppliers';
      const method = selectedSupplier ? 'PUT' : 'POST';

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
        throw new Error(errData.error || 'Произошла ошибка при сохранении контрагента.');
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

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">База поставщиков канцелярских товаров</h1>
          <p className="text-sm text-slate-500">Учет контрагентов, управление контактными данными и отслеживание истории поставок</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-transparent shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" /> Добавить поставщика
        </button>
      </div>

      {/* Список контрагентов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            Список поставщиков пуст. Добавьте первого контрагента для оформления закупок.
          </div>
        ) : (
          suppliers.map(sup => {
            const supplies = getSuppliesForSupplier(sup.id);
            const totalSuppliesValue = supplies.reduce((sum, s) => sum + s.totalAmount, 0);

            return (
              <motion.div
                key={sup.id}
                whileHover={{ y: -1 }}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base font-display">{sup.companyName}</h3>
                      {sup.contactPerson && <p className="text-xs text-slate-500 font-semibold">Лицо: {sup.contactPerson}</p>}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {sup.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {sup.phone}
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {sup.email}
                      </div>
                    )}
                    {sup.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /> <span>{sup.address}</span>
                      </div>
                    )}
                  </div>

                  {sup.comment && (
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500 italic">
                      {sup.comment}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                  <div className="text-xs">
                    <span className="text-slate-400 block uppercase font-bold tracking-wider text-[10px]">Поставок: {supplies.length}</span>
                    <span className="font-bold text-slate-800 font-mono">{formatPrice(totalSuppliesValue)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenHistory(sup)}
                      title="История поставок"
                      className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded cursor-pointer transition-colors"
                    >
                      Изменить
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Модальное окно Создания / Редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950 font-display">
                {selectedSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Название компании *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="E.g., ООО КанцОптТорг"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Контактное лицо (ФИО)</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-4567"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@kanzopt.ru"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Юридический / Фактический адрес</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="E.g., г. Москва, ул. Профсоюзная, д. 12, оф. 305"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Комментарий</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Дополнительные условия работы (скидки, условия отсрочки платежа, особенности доставки)..."
                  rows={2}
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
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Модальное окно истории поставок */}
      {isHistoryOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-display">История поставок</h2>
                <p className="text-xs text-slate-500">{selectedSupplier.companyName}</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {getSuppliesForSupplier(selectedSupplier.id).length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Поставок от этого контрагента пока не зарегистрировано.</p>
              ) : (
                getSuppliesForSupplier(selectedSupplier.id).map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 font-mono">{p.docNumber}</div>
                      <div className="text-slate-400 mt-0.5">Дата: {new Date(p.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div className="font-bold text-slate-800 font-mono text-right">
                      {formatPrice(p.totalAmount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer transition-colors"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
