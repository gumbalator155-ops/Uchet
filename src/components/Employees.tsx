import React, { useState } from 'react';
import { Plus, Edit, Trash, X, ShieldAlert, CheckCircle, Mail, Phone, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface EmployeesProps {
  employees: Employee[];
  userRole: 'Администратор' | 'Сотрудник';
  token: string | null;
  onRefresh: () => Promise<void>;
}

export const Employees: React.FC<EmployeesProps> = ({ employees, userRole, token, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Поля формы
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Сотрудник');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === 'Администратор';

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('Сотрудник');
    setPhone('');
    setIsActive(true);
    setError(null);
    setSelectedEmployee(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setIsActive(emp.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Заполните ФИО и рабочий Email сотрудника.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      phone: phone.trim() || undefined,
      isActive
    };

    try {
      const url = selectedEmployee ? `/api/employees/${selectedEmployee.id}` : '/api/employees';
      const method = selectedEmployee ? 'PUT' : 'POST';

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
        throw new Error(errData.error || 'Не удалось сохранить данные сотрудника.');
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
    if (!selectedEmployee) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось удалить сотрудника.');
      }

      await onRefresh();
      setIsDeleteOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Управление сотрудниками</h1>
          <p className="text-sm text-slate-500">Реестр персонала магазина, разграничение прав доступа и синхронизация аккаунтов</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-transparent shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> Добавить сотрудника
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 text-sm">Ограниченный режим</h3>
            <p className="text-xs text-amber-700 mt-1">
              У вас роль <span className="font-bold">Сотрудник</span>. Вы можете просматривать список коллег, но добавлять, редактировать или удалять учетные записи сотрудников может только Администратор.
            </p>
          </div>
        </div>
      )}

      {/* Список сотрудников */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">ФИО сотрудника</th>
                <th className="p-4">Роль в системе</th>
                <th className="p-4">Email для авторизации</th>
                <th className="p-4">Телефон</th>
                <th className="p-4 text-center">Статус</th>
                {isAdmin && <th className="p-4 text-right">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Сотрудники отсутствуют. Зарегистрируйте коллег.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/40">
                    <td className="p-4 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
                        emp.role === 'Администратор' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {emp.email}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      {emp.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {emp.phone}
                        </div>
                      ) : (
                        <span className="text-slate-400">Не указан</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        emp.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {emp.isActive ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded cursor-pointer"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleOpenDelete(emp)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 px-2.5 py-1.5 rounded border border-transparent cursor-pointer"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания / редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-950 font-display">
                {selectedEmployee ? 'Изменить сотрудника' : 'Добавить сотрудника'}
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ФИО Сотрудника *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Смирнова Анна Сергеевна"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Рабочий Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anna@mystore.ru"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Должен совпадать с Google аккаунтом для автоматической авторизации.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Роль доступа</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition cursor-pointer"
                  >
                    <option value="Сотрудник">Сотрудник</option>
                    <option value="Администратор">Администратор</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Рабочий Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (903) 111-2233"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="empActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-slate-900 border-slate-200 rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="empActive" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Активен (разрешен вход и работа в POS-терминале)
                </label>
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

      {/* Окно удаления сотрудника */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-950 font-display">Удаление сотрудника</h2>
            <p className="text-sm text-slate-500">
              Вы уверены, что хотите уволить/удалить сотрудника <span className="font-semibold text-slate-900">"{selectedEmployee?.name}"</span>? Все доступы к системе будут немедленно аннулированы.
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
