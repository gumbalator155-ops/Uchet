import React from 'react';
import { motion } from 'motion/react';
import { Package, AlertTriangle, TrendingUp, Calendar, DollarSign, Activity, FileText, ArrowUpRight, CheckCircle } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  totalStockValue: number;
  salesToday: number;
  salesThisMonth: number;
  recentMovements: Array<{
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
  }>;
  topSelling: Array<{
    name: string;
    sku: string;
    qty: number;
    revenue: number;
  }>;
}

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (section: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, loading, onNavigate }) => {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-700"></div>
        <span className="ml-3 text-slate-600 font-medium">Загрузка показателей...</span>
      </div>
    );
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">Сводная аналитика</h1>
          <p className="text-xs text-slate-500">Ключевые показатели эффективности и оперативная сводка магазина</p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-center">
          Сегодня: {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Сетка ключевых показателей */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start justify-between cursor-pointer"
          onClick={() => onNavigate('Товары')}
        >
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Всего товаров</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">{stats.totalProducts} <span className="text-xs text-slate-400 font-normal">ед.</span></div>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
              <CheckCircle className="h-3.5 w-3.5" /> В наличии: {stats.inStockProducts}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
            <Package className="h-4 w-4" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className={`p-5 bg-white rounded-xl border flex items-start justify-between cursor-pointer transition-colors ${
            stats.lowStockProducts > 0 
              ? 'border-red-200 bg-red-50/30' 
              : 'border-slate-200 shadow-sm'
          }`}
          onClick={() => onNavigate('Товары')}
        >
          <div className="space-y-1.5">
            <span className={`text-xs font-medium uppercase tracking-wider ${stats.lowStockProducts > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
              Критический остаток
            </span>
            <div className={`text-2xl font-bold font-mono ${stats.lowStockProducts > 0 ? 'text-red-700' : 'text-slate-900'}`}>
              {stats.lowStockProducts} <span className="text-xs font-normal opacity-85">поз.</span>
            </div>
            <span className={`text-[11px] flex items-center gap-1 font-semibold ${stats.lowStockProducts > 0 ? 'text-red-600' : 'text-slate-500'}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> Требуют заказа
            </span>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            stats.lowStockProducts > 0 
              ? 'bg-red-100 border-red-200 text-red-600' 
              : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 flex items-start justify-between cursor-pointer"
          onClick={() => onNavigate('Склад')}
        >
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Оценка склада</span>
            <div className="text-xl font-bold text-slate-900 font-mono">{formatPrice(stats.totalStockValue)}</div>
            <span className="text-[11px] text-slate-500 font-medium">Себестоимость запасов</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
            <DollarSign className="h-4 w-4" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 flex items-start justify-between cursor-pointer"
          onClick={() => onNavigate('Продажи')}
        >
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Продажи сегодня</span>
            <div className="text-xl font-bold text-slate-900 font-mono">{formatPrice(stats.salesToday)}</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Месяц: {formatPrice(stats.salesThisMonth)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
        </motion.div>
      </div>

      {/* Оповещения склада (если есть товары ниже лимита) */}
      {stats.lowStockProducts > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 text-sm">Внимание! Обнаружен низкий уровень запасов</h3>
            <p className="text-xs text-amber-700 mt-1">
              На складе {stats.lowStockProducts} товар(ов) достигли минимального уровня остатка или отсутствуют. Рекомендуется сформировать закупку у поставщиков.
            </p>
          </div>
        </div>
      )}

      {/* Детальная сводка: Движения + Топ продаж */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Последние движения */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-950 font-display">Последние складские операции</h2>
            </div>
            <button
              onClick={() => onNavigate('Склад')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              История движения <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">Нет последних операций на складе.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Товар / Артикул</th>
                    <th className="pb-2">Тип</th>
                    <th className="pb-2 text-right">Кол-во</th>
                    <th className="pb-2 text-right">Остаток</th>
                    <th className="pb-2 pl-4">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5">
                        <div className="font-medium text-slate-900">{m.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.productSku}</div>
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          m.type === 'Приход' ? 'bg-emerald-50 text-emerald-700' :
                          m.type === 'Расход' ? 'bg-rose-50 text-rose-700' :
                          m.type === 'Инвентаризация' ? 'bg-indigo-50 text-indigo-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className={`py-2.5 text-right font-semibold font-mono ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-600">{m.newStock}</td>
                      <td className="py-2.5 pl-4 text-slate-500 whitespace-nowrap">{formatDateTime(m.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Лидеры продаж */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-950 font-display">Топ продаваемых товаров</h2>
            </div>
            <button
              onClick={() => onNavigate('Отчеты')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Подробный отчет
            </button>
          </div>

          <div className="space-y-3">
            {stats.topSelling.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">Продаж пока не зарегистрировано.</div>
            ) : (
              stats.topSelling.map((item, idx) => (
                <div key={item.sku} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold font-mono">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 font-mono">{item.qty} шт</div>
                    <div className="text-[10px] text-slate-500">{formatPrice(item.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
