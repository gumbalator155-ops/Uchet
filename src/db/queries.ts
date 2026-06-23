import { eq, and, lte, gte, sql, desc, like, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  categories,
  products,
  suppliers,
  purchases,
  purchaseItems,
  sales,
  saleItems,
  stockMovements,
  employees
} from './schema.ts';

// 1. Полноценное создание или получение пользователя при логине
export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    // Проверяем, существует ли пользователь
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    // Проверяем, первый ли это вообще пользователь в системе
    const allUsers = await db.select().from(users).limit(1);
    const isFirstUser = allUsers.length === 0;

    // Ищем роль в таблице сотрудников по email
    const employeeMatch = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
    
    let role = 'Сотрудник';
    if (isFirstUser) {
      role = 'Администратор';
    } else if (employeeMatch.length > 0) {
      role = employeeMatch[0].role;
    }

    // Сохраняем пользователя
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        role,
      })
      .returning();

    // Если сопоставили с сотрудником, обновим его статус в системе (активен)
    if (employeeMatch.length > 0) {
      await db.update(employees)
        .set({ isActive: true })
        .where(eq(employees.email, email));
    }

    return result[0];
  } catch (error) {
    console.error('Ошибка в getOrCreateUser:', error);
    throw new Error('Не удалось войти в систему или зарегистрировать пользователя.', { cause: error });
  }
}

// 2. Получение данных для дашборда
export async function getDashboardStats() {
  try {
    // А. Общее количество товаров
    const allProducts = await db.select().from(products);
    const totalProducts = allProducts.length;

    // Б. Количество товаров в наличии (остаток > 0)
    const inStockProducts = allProducts.filter(p => p.stock > 0).length;

    // В. Товары с низким остатком (активные товары, где остаток <= минимальный остаток)
    const lowStockProducts = allProducts.filter(p => p.isActive && p.stock <= p.minStock).length;

    // Г. Стоимость складских остатков (сумма остаток * закупочная цена)
    const totalStockValue = allProducts.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

    // Д. Продажи за сегодня и за месяц
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allSales = await db.select().from(sales);
    const salesToday = allSales
      .filter(s => new Date(s.date) >= startOfToday)
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const salesThisMonth = allSales
      .filter(s => new Date(s.date) >= startOfMonth)
      .reduce((sum, s) => sum + s.totalAmount, 0);

    // Е. Последние операции (последние 10 движений по складу)
    const recentMovements = await db.select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      previousStock: stockMovements.previousStock,
      newStock: stockMovements.newStock,
      docNumber: stockMovements.docNumber,
      comment: stockMovements.comment,
      date: stockMovements.date,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .orderBy(desc(stockMovements.date))
    .limit(10);

    // Ж. Топ продаваемых товаров (на основе продаж)
    const allSaleItems = await db.select({
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      price: saleItems.price,
      productName: products.name,
      productSku: products.sku,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id));

    const topMap: Record<number, { name: string; sku: string; qty: number; revenue: number }> = {};
    for (const item of allSaleItems) {
      if (!topMap[item.productId]) {
        topMap[item.productId] = { name: item.productName, sku: item.productSku, qty: 0, revenue: 0 };
      }
      topMap[item.productId].qty += item.quantity;
      topMap[item.productId].revenue += (item.quantity * item.price);
    }

    const topSelling = Object.values(topMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalProducts,
      inStockProducts,
      lowStockProducts,
      totalStockValue,
      salesToday,
      salesThisMonth,
      recentMovements,
      topSelling
    };
  } catch (error) {
    console.error('Ошибка в getDashboardStats:', error);
    throw new Error('Не удалось рассчитать показатели дашборда.', { cause: error });
  }
}

// 3. Товары (CRUD, поиск, фильтрация)
export async function getProducts(search?: string, categoryId?: number, showOnlyActive = false) {
  try {
    let query = db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      description: products.description,
      unit: products.unit,
      purchasePrice: products.purchasePrice,
      retailPrice: products.retailPrice,
      stock: products.stock,
      minStock: products.minStock,
      imageUrl: products.imageUrl,
      isActive: products.isActive,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));

    const result = await query;
    let filtered = result;

    if (showOnlyActive) {
      filtered = filtered.filter(p => p.isActive);
    }
    if (categoryId) {
      filtered = filtered.filter(p => p.categoryId === categoryId);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.sku.toLowerCase().includes(s) || 
        (p.categoryName && p.categoryName.toLowerCase().includes(s))
      );
    }

    return filtered;
  } catch (error) {
    console.error('Ошибка в getProducts:', error);
    throw new Error('Не удалось получить список товаров.', { cause: error });
  }
}

export async function createProduct(data: {
  sku: string;
  name: string;
  categoryId: number | null;
  description?: string;
  unit?: string;
  purchasePrice: number;
  retailPrice: number;
  stock?: number;
  minStock: number;
  imageUrl?: string;
  isActive?: boolean;
}) {
  try {
    const result = await db.insert(products)
      .values({
        sku: data.sku,
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        unit: data.unit || 'шт',
        purchasePrice: data.purchasePrice,
        retailPrice: data.retailPrice,
        stock: data.stock || 0,
        minStock: data.minStock,
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    // Записываем начальное движение, если остаток больше 0
    if (data.stock && data.stock > 0) {
      await db.insert(stockMovements).values({
        productId: result[0].id,
        type: 'Приход',
        quantity: data.stock,
        previousStock: 0,
        newStock: data.stock,
        docNumber: 'НАЧ_ОСТАТОК',
        comment: 'Ввод начальных остатков при создании товара',
      });
    }

    return result[0];
  } catch (error) {
    console.error('Ошибка в createProduct:', error);
    throw new Error('Не удалось создать товар. Убедитесь, что артикул уникален.', { cause: error });
  }
}

export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  try {
    const original = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (original.length === 0) throw new Error('Товар не найден.');

    const result = await db.update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();

    return result[0];
  } catch (error) {
    console.error('Ошибка в updateProduct:', error);
    throw new Error('Не удалось обновить товар.', { cause: error });
  }
}

export async function deleteProduct(id: number) {
  try {
    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error('Ошибка в deleteProduct:', error);
    throw new Error('Не удалось удалить товар. Возможно, он используется в закупках или продажах.', { cause: error });
  }
}

// 4. Категории
export async function getCategories() {
  try {
    return await db.select().from(categories).orderBy(categories.name);
  } catch (error) {
    console.error('Ошибка в getCategories:', error);
    throw new Error('Не удалось получить список категорий.', { cause: error });
  }
}

export async function createCategory(name: string, description?: string) {
  try {
    const result = await db.insert(categories)
      .values({ name, description })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Ошибка в createCategory:', error);
    throw new Error('Не удалось создать категорию. Убедитесь, что имя уникально.', { cause: error });
  }
}

export async function updateCategory(id: number, name: string, description?: string) {
  try {
    const result = await db.update(categories)
      .set({ name, description })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Ошибка в updateCategory:', error);
    throw new Error('Не удалось обновить категорию.', { cause: error });
  }
}

export async function deleteCategory(id: number) {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  } catch (error) {
    console.error('Ошибка в deleteCategory:', error);
    throw new Error('Не удалось удалить категорию.', { cause: error });
  }
}

// 5. Поставщики
export async function getSuppliers() {
  try {
    return await db.select().from(suppliers).orderBy(suppliers.companyName);
  } catch (error) {
    console.error('Ошибка в getSuppliers:', error);
    throw new Error('Не удалось получить список поставщиков.', { cause: error });
  }
}

export async function createSupplier(data: {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  comment?: string;
}) {
  try {
    const result = await db.insert(suppliers).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Ошибка в createSupplier:', error);
    throw new Error('Не удалось добавить поставщика.', { cause: error });
  }
}

export async function updateSupplier(id: number, data: Partial<typeof suppliers.$inferInsert>) {
  try {
    const result = await db.update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Ошибка в updateSupplier:', error);
    throw new Error('Не удалось обновить информацию о поставщике.', { cause: error });
  }
}

// 6. Сотрудники
export async function getEmployees() {
  try {
    return await db.select().from(employees).orderBy(employees.name);
  } catch (error) {
    console.error('Ошибка в getEmployees:', error);
    throw new Error('Не удалось получить список сотрудников.', { cause: error });
  }
}

export async function createEmployee(data: {
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive?: boolean;
}) {
  try {
    const result = await db.insert(employees).values(data).returning();
    
    // Синхронизируем роль в таблице пользователей, если этот пользователь уже зарегистрирован
    await db.update(users)
      .set({ role: data.role })
      .where(eq(users.email, data.email));

    return result[0];
  } catch (error) {
    console.error('Ошибка в createEmployee:', error);
    throw new Error('Не удалось добавить сотрудника. Email должен быть уникальным.', { cause: error });
  }
}

export async function updateEmployee(id: number, data: Partial<typeof employees.$inferInsert>) {
  try {
    const original = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    if (original.length === 0) throw new Error('Сотрудник не найден.');

    const result = await db.update(employees)
      .set(data)
      .where(eq(employees.id, id))
      .returning();

    // Если email или роль поменялись, синхронизируем пользователя
    if (data.role || data.email) {
      const updateFields: Record<string, string> = {};
      if (data.role) updateFields.role = data.role;
      await db.update(users)
        .set(updateFields)
        .where(eq(users.email, original[0].email));
    }

    return result[0];
  } catch (error) {
    console.error('Ошибка в updateEmployee:', error);
    throw new Error('Не удалось обновить сотрудника.', { cause: error });
  }
}

export async function deleteEmployee(id: number) {
  try {
    const original = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    if (original.length > 0) {
      // Удаляем или разрываем привязку
      await db.delete(employees).where(eq(employees.id, id));
    }
    return { success: true };
  } catch (error) {
    console.error('Ошибка в deleteEmployee:', error);
    throw new Error('Не удалось удалить сотрудника.', { cause: error });
  }
}

// 7. Закупки (Поступление товаров)
export async function getPurchases() {
  try {
    const result = await db.select({
      id: purchases.id,
      docNumber: purchases.docNumber,
      date: purchases.date,
      supplierId: purchases.supplierId,
      supplierName: suppliers.companyName,
      totalAmount: purchases.totalAmount,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .orderBy(desc(purchases.date));

    // Дополняем элементами закупок
    const purchasesWithItems = [];
    for (const pur of result) {
      const items = await db.select({
        id: purchaseItems.id,
        productId: purchaseItems.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: purchaseItems.quantity,
        purchasePrice: purchaseItems.purchasePrice,
      })
      .from(purchaseItems)
      .innerJoin(products, eq(purchaseItems.productId, products.id))
      .where(eq(purchaseItems.purchaseId, pur.id));

      purchasesWithItems.push({
        ...pur,
        items
      });
    }

    return purchasesWithItems;
  } catch (error) {
    console.error('Ошибка в getPurchases:', error);
    throw new Error('Не удалось получить журнал закупок.', { cause: error });
  }
}

export async function createPurchase(data: {
  docNumber: string;
  date: string;
  supplierId: number | null;
  items: { productId: number; quantity: number; purchasePrice: number }[];
}) {
  try {
    // 1. Создаем сам документ закупки
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    const purchaseResult = await db.insert(purchases)
      .values({
        docNumber: data.docNumber,
        date: new Date(data.date),
        supplierId: data.supplierId,
        totalAmount,
      })
      .returning();

    const purchase = purchaseResult[0];

    // 2. Обрабатываем каждый элемент
    for (const item of data.items) {
      // Сохраняем элемент закупки
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
      });

      // Считываем текущий остаток товара
      const productResult = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (productResult.length > 0) {
        const prod = productResult[0];
        const previousStock = prod.stock;
        const newStock = previousStock + item.quantity;

        // Обновляем остаток товара и его закупочную цену
        await db.update(products)
          .set({ 
            stock: newStock,
            purchasePrice: item.purchasePrice, // Обновляем закупочную цену последней закупкой
          })
          .where(eq(products.id, item.productId));

        // Логируем движение товара на складе
        await db.insert(stockMovements).values({
          productId: item.productId,
          type: 'Приход',
          quantity: item.quantity,
          previousStock,
          newStock,
          docNumber: data.docNumber,
          comment: `Поступление товара по накладной №${data.docNumber}`,
          date: new Date(data.date),
        });
      }
    }

    return purchase;
  } catch (error) {
    console.error('Ошибка в createPurchase:', error);
    throw new Error('Не удалось провести закупку. Проверьте уникальность номера документа и корректность данных.', { cause: error });
  }
}

// 8. Продажи
export async function getSales() {
  try {
    const result = await db.select({
      id: sales.id,
      docNumber: sales.docNumber,
      date: sales.date,
      employeeName: sales.employeeName,
      totalAmount: sales.totalAmount,
    })
    .from(sales)
    .orderBy(desc(sales.date));

    const salesWithItems = [];
    for (const sale of result) {
      const items = await db.select({
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: saleItems.quantity,
        price: saleItems.price,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, sale.id));

      salesWithItems.push({
        ...sale,
        items
      });
    }

    return salesWithItems;
  } catch (error) {
    console.error('Ошибка в getSales:', error);
    throw new Error('Не удалось получить журнал продаж.', { cause: error });
  }
}

export async function createSale(data: {
  docNumber: string;
  date: string;
  employeeName: string;
  items: { productId: number; quantity: number; price: number }[];
}) {
  try {
    // Проверка наличия на складе перед оформлением продажи
    for (const item of data.items) {
      const prodRes = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (prodRes.length === 0) {
        throw new Error(`Товар с ID ${item.productId} не найден.`);
      }
      if (prodRes[0].stock < item.quantity) {
        throw new Error(`Недостаточно товара "${prodRes[0].name}" на складе. Запрошено: ${item.quantity}, в наличии: ${prodRes[0].stock}`);
      }
    }

    // 1. Оформляем документ продажи
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const saleResult = await db.insert(sales)
      .values({
        docNumber: data.docNumber,
        date: new Date(data.date),
        employeeName: data.employeeName,
        totalAmount,
      })
      .returning();

    const sale = saleResult[0];

    // 2. Списываем остатки и логируем движения
    for (const item of data.items) {
      await db.insert(saleItems).values({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      });

      const prodRes = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      const prod = prodRes[0];
      const previousStock = prod.stock;
      const newStock = previousStock - item.quantity;

      // Обновляем остаток
      await db.update(products)
        .set({ stock: newStock })
        .where(eq(products.id, item.productId));

      // Логируем движение
      await db.insert(stockMovements).values({
        productId: item.productId,
        type: 'Расход',
        quantity: -item.quantity,
        previousStock,
        newStock,
        docNumber: data.docNumber,
        comment: `Продажа товара по документу №${data.docNumber}`,
        date: new Date(data.date),
      });
    }

    return sale;
  } catch (error: any) {
    console.error('Ошибка в createSale:', error);
    throw new Error(error.message || 'Не удалось провести продажу.', { cause: error });
  }
}

// 9. Корректировка и инвентаризация остатков на складе
export async function adjustStock(data: {
  productId: number;
  type: 'Корректировка' | 'Инвентаризация';
  newStock: number;
  comment?: string;
}) {
  try {
    const prodRes = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
    if (prodRes.length === 0) throw new Error('Товар не найден.');

    const prod = prodRes[0];
    const previousStock = prod.stock;
    const newStock = data.newStock;
    const difference = newStock - previousStock;

    // Обновляем остаток товара
    const result = await db.update(products)
      .set({ stock: newStock })
      .where(eq(products.id, data.productId))
      .returning();

    // Записываем операцию
    await db.insert(stockMovements).values({
      productId: data.productId,
      type: data.type,
      quantity: difference,
      previousStock,
      newStock,
      docNumber: data.type === 'Инвентаризация' ? 'ИНВ_АКТ' : 'КОРР_АКТ',
      comment: data.comment || `${data.type} остатков (разница: ${difference > 0 ? '+' : ''}${difference})`,
    });

    return result[0];
  } catch (error) {
    console.error('Ошибка в adjustStock:', error);
    throw new Error('Не удалось скорректировать остатки на складе.', { cause: error });
  }
}

// 10. История движения товаров
export async function getStockMovementHistory(productId?: number) {
  try {
    let query = db.select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      previousStock: stockMovements.previousStock,
      newStock: stockMovements.newStock,
      docNumber: stockMovements.docNumber,
      comment: stockMovements.comment,
      date: stockMovements.date,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .orderBy(desc(stockMovements.date));

    const result = await query;
    if (productId) {
      return result.filter(m => m.productId === productId);
    }
    return result;
  } catch (error) {
    console.error('Ошибка в getStockMovementHistory:', error);
    throw new Error('Не удалось получить историю движения товаров.', { cause: error });
  }
}

// 11. Отчет о прибыли
export async function getProfitReport(startDateStr?: string, endDateStr?: string) {
  try {
    // Считываем все позиции продаж за выбранный период
    let sItemsQuery = db.select({
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      price: saleItems.price,
      saleDate: sales.date,
      productName: products.name,
      productSku: products.sku,
      purchasePriceOnProduct: products.purchasePrice, // Текущая себестоимость для расчета, если не найдем по закупкам
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id));

    const sItems = await sItemsQuery;
    let filteredItems = sItems;

    if (startDateStr) {
      const sDate = new Date(startDateStr);
      filteredItems = filteredItems.filter(item => new Date(item.saleDate) >= sDate);
    }
    if (endDateStr) {
      const eDate = new Date(endDateStr);
      filteredItems = filteredItems.filter(item => new Date(item.saleDate) <= eDate);
    }

    // Собираем агрегированные показатели
    let totalRevenue = 0; // Розничная выручка
    let totalCost = 0; // Закупочная стоимость проданных товаров (себестоимость)
    const productBreakdown: Record<number, { name: string; sku: string; qty: number; revenue: number; cost: number; profit: number }> = {};

    for (const item of filteredItems) {
      const itemRevenue = item.quantity * item.price;
      // Себестоимость рассчитываем по текущей закупочной цене товара из базы (классический учет)
      const itemCost = item.quantity * item.purchasePriceOnProduct;
      const itemProfit = itemRevenue - itemCost;

      totalRevenue += itemRevenue;
      totalCost += itemCost;

      if (!productBreakdown[item.productId]) {
        productBreakdown[item.productId] = {
          name: item.productName,
          sku: item.productSku,
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }

      productBreakdown[item.productId].qty += item.quantity;
      productBreakdown[item.productId].revenue += itemRevenue;
      productBreakdown[item.productId].cost += itemCost;
      productBreakdown[item.productId].profit += itemProfit;
    }

    const profit = totalRevenue - totalCost;

    return {
      totalRevenue,
      totalCost,
      profit,
      items: Object.values(productBreakdown).sort((a, b) => b.profit - a.profit),
    };
  } catch (error) {
    console.error('Ошибка в getProfitReport:', error);
    throw new Error('Не удалось сформировать отчет по прибыли.', { cause: error });
  }
}
