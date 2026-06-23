import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/auth-context.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Products } from './components/Products.tsx';
import { Categories } from './components/Categories.tsx';
import { Warehouse } from './components/Warehouse.tsx';
import { Purchases } from './components/Purchases.tsx';
import { Sales } from './components/Sales.tsx';
import { Suppliers } from './components/Suppliers.tsx';
import { Employees } from './components/Employees.tsx';
import { Reports } from './components/Reports.tsx';

import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  LogOut,
  Menu,
  X,
  Lock,
  Loader2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Section = 'Панель' | 'Товары' | 'Категории' | 'Склад' | 'Закупки' | 'Продажи' | 'Поставщики' | 'Сотрудники' | 'Отчеты';

export default function App() {
  const { user, dbUser, token, loading, signInWithGoogle, signOutUser, isFirebaseDummy, signInAsDevUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('Панель');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Глобальные состояния данных
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  const [loadingData, setLoadingData] = useState(false);

  // Функция для загрузки всех данных из API
  const refreshAllData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [
        statsRes,
        productsRes,
        categoriesRes,
        suppliersRes,
        employeesRes,
        purchasesRes,
        salesRes
      ] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/employees', { headers }),
        fetch('/api/purchases', { headers }),
        fetch('/api/sales', { headers })
      ]);

      if (statsRes.ok) setDashboardStats(await statsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
    } catch (err) {
      console.error('Ошибка при синхронизации данных:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token && dbUser) {
      refreshAllData();
    }
  }, [token, dbUser]);

  // Если идет загрузка сессии авторизации
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-slate-800 animate-spin" />
        <span className="mt-3 text-slate-600 font-medium">Проверка авторизации...</span>
      </div>
    );
  }

  // Если пользователь НЕ авторизован
  if (!user) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
        {/* Левая сторона: форма */}
        <div className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 md:p-20 bg-white">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white p-2.5 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
                Канцелярский Магазин
              </h1>
              <p className="text-slate-500 text-sm">
                Система учета остатков, партионного закупа, продаж и оперативной аналитики для небольшого розничного магазина.
              </p>
            </div>

            <div className="space-y-4">
              {isFirebaseDummy ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                    Режим локальной разработки. Выберите роль для входа в систему:
                  </div>
                  <button
                    onClick={() => signInAsDevUser('Администратор')}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Войти как Администратор
                  </button>
                  <button
                    onClick={() => signInAsDevUser('Сотрудник')}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 px-4 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Войти как Сотрудник
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="w-full inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.414 0-6.19-2.77-6.19-6.19 0-3.42 2.776-6.19 6.19-6.19 1.483 0 2.833.525 3.898 1.4L21.1 4.47C18.8 2.3 15.74 1 12.24 1 6.04 1 1 6.04 1 12.24s5.04 11.24 11.24 11.24c5.89 0 10.8-4.26 11.21-10h-11.21z"
                    />
                  </svg>
                  Войти через Google Workspace
                </button>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5 justify-center">
              <Lock className="h-3 w-3" /> Безопасное корпоративное шифрование Google SSL
            </div>
          </div>
        </div>

        {/* Правая сторона: баннер */}
        <div className="hidden lg:flex lg:col-span-7 bg-slate-900 flex-col justify-between p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Enterprise CRM</span>
            <h2 className="text-4xl font-bold tracking-tight font-display max-w-lg">Интеллектуальный контроль склада и автоматизация розничной торговли</h2>
          </div>
          <div className="relative mt-auto border-t border-slate-800 pt-8 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>© {new Date().getFullYear()} Канцелярский магазин. Все права защищены.</span>
            <span>Версия системы: v1.4.0 (Cloud SQL)</span>
          </div>
        </div>
      </div>
    );
  }

  // Если у пользователя нет разрешенной роли или он заблокирован
  if (user && !dbUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="inline-flex p-4 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 font-display">Доступ заблокирован</h1>
            <p className="text-sm text-slate-500">
              Вы успешно авторизовались как <span className="font-semibold text-slate-800">{user.email}</span>, но вашей учетной записи нет в списке авторизованного персонала магазина.
            </p>
          </div>
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-left">
            Обратитесь к главному Администратору магазина, чтобы он добавил ваш Email в справочник сотрудников во вкладке «Управление сотрудниками».
          </div>
          <button
            onClick={signOutUser}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition cursor-pointer"
          >
            Выйти из системы
          </button>
        </div>
      </div>
    );
  }

  const employeeRole = dbUser?.role || 'Сотрудник';
  const employeeName = dbUser?.name || user.displayName || 'Сотрудник';

  const menuItems = [
    { name: 'Панель', label: 'Панель управления', icon: LayoutDashboard },
    { name: 'Товары', label: 'Номенклатура', icon: Package },
    { name: 'Категории', label: 'Категории товаров', icon: Tags },
    { name: 'Склад', label: 'Складской учет', icon: WarehouseIcon },
    { name: 'Закупки', label: 'Закупки', icon: Truck },
    { name: 'Продажи', label: 'POS-терминал', icon: ShoppingBag },
    { name: 'Поставщики', label: 'Поставщики', icon: Users },
    { name: 'Сотрудники', label: 'Сотрудники', icon: Users, adminOnly: true },
    { name: 'Отчеты', label: 'Аналитика', icon: TrendingUp },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || employeeRole === 'Администратор');

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'Панель':
        return <Dashboard stats={dashboardStats} loading={loadingData} onNavigate={(sect) => setActiveSection(sect as Section)} />;
      case 'Товары':
        return (
          <Products
            products={products}
            categories={categories}
            userRole={employeeRole}
            token={token}
            onRefresh={refreshAllData}
          />
        );
      case 'Категории':
        return (
          <Categories
            categories={categories}
            products={products}
            userRole={employeeRole}
            token={token}
            onRefresh={refreshAllData}
          />
        );
      case 'Склад':
        return <Warehouse products={products} token={token} onRefresh={refreshAllData} />;
      case 'Закупки':
        return (
          <Purchases
            purchases={purchases}
            suppliers={suppliers}
            products={products}
            token={token}
            onRefresh={refreshAllData}
          />
        );
      case 'Продажи':
        return (
          <Sales
            sales={sales}
            products={products}
            currentUserName={employeeName}
            token={token}
            onRefresh={refreshAllData}
          />
        );
      case 'Поставщики':
        return (
          <Suppliers
            suppliers={suppliers}
            purchases={purchases}
            token={token}
            onRefresh={refreshAllData}
          />
        );
      case 'Сотрудники':
        return <Employees employees={employees} userRole={employeeRole} token={token} onRefresh={refreshAllData} />;
      case 'Отчеты':
        return (
          <Reports
            sales={sales}
            purchases={purchases}
            products={products}
            categories={categories}
          />
        );
      default:
        return <div className="text-center py-12">Раздел в разработке...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Боковая панель для десктопа */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 text-slate-800">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 font-display">КанцСнаб</h1>
        </div>

        {/* Меню навигации */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveSection(item.name as Section)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Профиль сотрудника */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 p-2 mb-2">
            <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
              {employeeName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{employeeName}</p>
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                employeeRole === 'Администратор' ? 'bg-blue-50 text-blue-700 border border-blue-100/55' : 'bg-slate-100 text-slate-600 border border-slate-200/55'
              }`}>
                {employeeRole}
              </span>
            </div>
          </div>
          <button
            onClick={signOutUser}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выход из системы
          </button>
        </div>
      </aside>

      {/* Основная часть приложения */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Шапка для мобильных устройств */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 text-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <span className="font-extrabold tracking-tight uppercase text-sm font-display text-slate-950">КанцСнаб</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer text-slate-700"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Шапка для десктопа */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              {menuItems.find(item => item.name === activeSection)?.label || activeSection}
            </h2>
            <div className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
              ОНЛАЙН
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span>База данных подключена</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </header>

        {/* Мобильная шторка */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-10 flex lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
              ></motion.div>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="relative flex flex-col w-64 bg-white border-r border-slate-200 text-slate-800 p-4 h-full"
              >
                <div className="flex items-center gap-2 pb-6 border-b border-slate-100 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold tracking-tight text-slate-950 uppercase text-sm font-display">КанцСнаб</span>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                  {filteredMenuItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setActiveSection(item.name as Section);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="border-t border-slate-100 pt-4 mt-auto">
                  <div className="flex items-center gap-3 p-2 mb-2">
                    <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-xs">
                      {employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{employeeName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{employeeRole}</p>
                    </div>
                  </div>
                  <button
                    onClick={signOutUser}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Секция контента */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full mx-auto">
          {loadingData && (
            <div className="flex items-center justify-end gap-1.5 text-xs text-slate-400 font-medium mb-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Синхронизация БД...
            </div>
          )}
          {renderActiveSection()}
        </main>

        {/* Status Bar Footer */}
        <footer className="hidden sm:flex h-10 bg-white border-t border-slate-200 px-8 items-center justify-between text-[10px] text-slate-500 shrink-0 uppercase tracking-wider font-mono">
           <div className="flex items-center gap-6">
             <span>Смена: 08:00 - 20:00</span>
             <span>Пользователь: {employeeName}</span>
           </div>
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span>База данных подключена</span>
             </div>
             <span>v1.4.0 (Cloud SQL)</span>
           </div>
        </footer>
      </div>
    </div>
  );
}
