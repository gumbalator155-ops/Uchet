import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, Calendar, TrendingUp, DollarSign, ShoppingCart, Percent, AlertCircle } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from './ExportUtils.ts';

interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number | null;
  categoryName: string | null;
  purchasePrice: number;
  retailPrice: number;
}

interface SaleItem {
  productId: number;
  quantity: number;
  price: number;
}

interface Sale {
  id: number;
  date: string;
  totalAmount: number;
  items: SaleItem[];
}

interface PurchaseItem {
  productId: number;
  quantity: number;
  purchasePrice: number;
}

interface Purchase {
  id: number;
  date: string;
  totalAmount: number;
  items: PurchaseItem[];
}

interface Category {
  id: number;
  name: string;
}

interface ReportsProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  categories: Category[];
}

export const Reports: React.FC<ReportsProps> = ({ sales, purchases, products, categories }) => {
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Фильтрация данных по дате
  const filterByDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (dateRange === 'today') {
      return date.toDateString() === today.toDateString();
    }
    if (dateRange === '7days') {
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (dateRange === 'month') {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
    return true; // all
  };

  const filteredSales = sales.filter(s => filterByDate(s.date));
  const filteredPurchases = purchases.filter(p => filterByDate(p.date));

  // 1. Выручка от продаж
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);

  // 2. Себестоимость проданных товаров (исходя из цен закупок продуктов в базе)
  const totalCostOfGoodsSold = filteredSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const purchasePrice = prod ? prod.purchasePrice : 0;
      return itemSum + (item.quantity * purchasePrice);
    }, 0);
  }, 0);

  // 3. Чистая прибыль
  const netProfit = totalRevenue - totalCostOfGoodsSold;

  // 4. Рентабельность
  const marginPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // 5. Группировка продаж по категориям
  const categoryStats = categories.map(cat => {
    let quantitySold = 0;
    let revenue = 0;
    let cost = 0;

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.categoryId === cat.id) {
          quantitySold += item.quantity;
          revenue += item.quantity * item.price;
          cost += item.quantity * prod.purchasePrice;
        }
      });
    });

    const profit = revenue - cost;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      quantitySold,
      revenue,
      cost,
      profit
    };
  }).filter(stat => stat.quantitySold > 0) // Показываем только проданные категории
    .sort((a, b) => b.revenue - a.revenue);

  // 6. Топ продаваемых товаров
  const productSalesStats = products.map(p => {
    let qty = 0;
    let rev = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId === p.id) {
          qty += item.quantity;
          rev += item.quantity * item.price;
        }
      });
    });
    return {
      name: p.name,
      sku: p.sku,
      qty,
      revenue: rev
    };
  }).filter(stat => stat.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  // Экспорт данных
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const title = `Отчет по аналитике продаж (${dateRange === 'today' ? 'За сегодня' : dateRange === '7days' ? 'За 7 дней' : dateRange === 'month' ? 'За месяц' : 'Все время'})`;
    const headers = ['Категория', 'Продано (шт)', 'Выручка (₽)', 'Себестоимость (₽)', 'Чистая прибыль (₽)'];
    
    const rows = categoryStats.map(stat => [
      stat.categoryName,
      stat.quantitySold,
      stat.revenue.toFixed(2),
      stat.cost.toFixed(2),
      stat.profit.toFixed(2)
    ]);

    // Добавляем итоговую строку
    rows.push([
      'ИТОГО',
      categoryStats.reduce((sum, s) => sum + s.quantitySold, 0).toString(),
      totalRevenue.toFixed(2),
      totalCostOfGoodsSold.toFixed(2),
      netProfit.toFixed(2)
    ]);

    if (format === 'csv') {
      exportToCSV('sales-report', headers, rows);
    } else if (format === 'excel') {
      exportToExcel('sales-report-excel', headers, rows);
    } else {
      exportToPDF(title, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Шапка отчетов */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-display">Аналитика и отчетность</h1>
          <p className="text-sm text-slate-500">Контроль финансового результата, рентабельности и структуры продаж</p>
        </div>

        {/* Фильтр по датам */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start">
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              dateRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Все время
          </button>
          <button
            onClick={() => setDateRange('today')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              dateRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Сегодня
          </button>
          <button
            onClick={() => setDateRange('7days')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              dateRange === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            7 дней
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              dateRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Месяц
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Выручка</span>
            <span className="text-xl font-bold text-slate-900 font-mono block">{formatPrice(totalRevenue)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Себестоимость</span>
            <span className="text-xl font-bold text-slate-500 font-mono block">{formatPrice(totalCostOfGoodsSold)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Чистая прибыль</span>
            <span className="text-xl font-bold text-slate-900 font-mono block">{formatPrice(netProfit)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Рентабельность</span>
            <span className="text-xl font-bold text-slate-900 font-mono block">{marginPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Раздел экспорта и визуализации */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Анализ по категориям */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-950 font-display">Структура продаж по категориям</h2>
            
            {/* Меню экспорта */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                title="Экспортировать в CSV"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                title="Экспортировать в Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                title="Печать отчета / PDF"
              >
                <Printer className="h-3.5 w-3.5" /> Печать / PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {categoryStats.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">Нет данных о продажах за выбранный период.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Категория канцелярских товаров</th>
                    <th className="pb-3 text-right">Продано (шт)</th>
                    <th className="pb-3 text-right">Выручка (₽)</th>
                    <th className="pb-3 text-right">Себестоимость (₽)</th>
                    <th className="pb-3 text-right">Чистая прибыль (₽)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {categoryStats.map(stat => (
                    <tr key={stat.categoryId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800">{stat.categoryName}</td>
                      <td className="py-3 text-right font-mono text-slate-600">{stat.quantitySold} шт</td>
                      <td className="py-3 text-right font-mono text-slate-900">{formatPrice(stat.revenue)}</td>
                      <td className="py-3 text-right font-mono text-slate-500">{formatPrice(stat.cost)}</td>
                      <td className={`py-3 text-right font-mono font-bold ${stat.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatPrice(stat.profit)}
                      </td>
                    </tr>
                  ))}
                  {/* Итоговая строка */}
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <td className="py-3 pl-2">ИТОГО ПО ОТЧЕТУ:</td>
                    <td className="py-3 text-right font-mono">
                      {categoryStats.reduce((sum, s) => sum + s.quantitySold, 0)} шт
                    </td>
                    <td className="py-3 text-right font-mono">{formatPrice(totalRevenue)}</td>
                    <td className="py-3 text-right font-mono text-slate-500">{formatPrice(totalCostOfGoodsSold)}</td>
                    <td className="py-3 text-right font-mono text-emerald-600">{formatPrice(netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Топ продаваемых товаров в SVG визуализации */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 lg:col-span-4 space-y-4">
          <h2 className="text-base font-bold text-slate-950 font-display border-b border-slate-100 pb-3">
            Лидеры продаж (Рейтинг)
          </h2>

          {productSalesStats.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">Нет данных для графика.</div>
          ) : (
            <div className="space-y-4 pt-2">
              {productSalesStats.map((item, idx) => {
                // Вычисляем процент заполнения шкалы относительно максимального объема продаж
                const maxQty = productSalesStats[0].qty;
                const pct = (item.qty / maxQty) * 100;

                return (
                  <div key={item.sku} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate max-w-[160px]" title={item.name}>{item.name}</span>
                      <span className="text-slate-500 font-mono">{item.qty} шт</span>
                    </div>
                    {/* Линейный SVG/CSS прогресс-бар */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
