import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getDashboardStats,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSuppliers,
  createSupplier,
  updateSupplier,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getPurchases,
  createPurchase,
  getSales,
  createSale,
  adjustStock,
  getStockMovementHistory,
  getProfitReport
} from './src/db/queries.ts';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing requests
  app.use(express.json());

  // API Routes - Secured with Firebase Auth middleware
  
  // 1. Текущий пользователь и роль
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const name = req.user?.name || req.user?.email?.split('@')[0];

      if (!uid || !email) {
        return res.status(400).json({ error: 'Неверные данные пользователя из токена' });
      }

      const user = await getOrCreateUser(uid, email, name);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Дашборд статистика
  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Товары CRUD
  app.get('/api/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const search = req.query.search as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const showOnlyActive = req.query.showOnlyActive === 'true';
      
      const productsList = await getProducts(search, categoryId, showOnlyActive);
      res.json(productsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Ограничение: создание товаров доступно только Администратору
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const product = await createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ограничение: редактирование товаров доступно только Администратору
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const product = await updateProduct(id, req.body);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);

      // Ограничение: удаление товаров доступно только Администратору
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const result = await deleteProduct(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Категории CRUD
  app.get('/api/categories', requireAuth, async (req: AuthRequest, res) => {
    try {
      const categoriesList = await getCategories();
      res.json(categoriesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/categories', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const { name, description } = req.body;
      const category = await createCategory(name, description);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/categories/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const id = parseInt(req.params.id);
      const { name, description } = req.body;
      const category = await updateCategory(id, name, description);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/categories/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const id = parseInt(req.params.id);
      const result = await deleteCategory(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Поставщики CRUD
  app.get('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const suppliersList = await getSuppliers();
      res.json(suppliersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res) => {
    try {
      const supplier = await createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await updateSupplier(id, req.body);
      res.json(supplier);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Сотрудники CRUD
  app.get('/api/employees', requireAuth, async (req: AuthRequest, res) => {
    try {
      const employeesList = await getEmployees();
      res.json(employeesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/employees', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const employee = await createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/employees/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const id = parseInt(req.params.id);
      const employee = await updateEmployee(id, req.body);
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/employees/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (uid && email) {
        const dbUser = await getOrCreateUser(uid, email);
        if (dbUser.role !== 'Администратор') {
          return res.status(403).json({ error: 'Доступ запрещен. Требуется роль Администратора.' });
        }
      }

      const id = parseInt(req.params.id);
      const result = await deleteEmployee(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Закупки CRUD (Приход)
  app.get('/api/purchases', requireAuth, async (req: AuthRequest, res) => {
    try {
      const purchasesList = await getPurchases();
      res.json(purchasesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/purchases', requireAuth, async (req: AuthRequest, res) => {
    try {
      const purchase = await createPurchase(req.body);
      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 8. Продажи CRUD (Расход)
  app.get('/api/sales', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salesList = await getSales();
      res.json(salesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sales', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sale = await createSale(req.body);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 9. Складской учет (Движение, корректировки, инвентаризация)
  app.get('/api/stock-movements', requireAuth, async (req: AuthRequest, res) => {
    try {
      const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
      const history = await getStockMovementHistory(productId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stock-movements/adjust', requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await adjustStock(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 10. Отчет по прибыли
  app.get('/api/reports/profit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const report = await getProfitReport(startDate, endDate);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Serve client application with Vite in development or static folder in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
  });
}

startServer();
