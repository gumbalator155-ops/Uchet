import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

// Таблица пользователей для авторизации (соответствует Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('Сотрудник'), // 'Администратор' | 'Сотрудник'
  createdAt: timestamp('created_at').defaultNow(),
});

// Таблица категорий канцелярских товаров
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// Таблица товаров
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(), // Артикул
  name: text('name').notNull(), // Наименование
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  description: text('description'), // Описание
  unit: text('unit').notNull().default('шт'), // Единица измерения
  purchasePrice: doublePrecision('purchase_price').notNull().default(0), // Закупочная цена
  retailPrice: doublePrecision('retail_price').notNull().default(0), // Розничная цена
  stock: integer('stock').notNull().default(0), // Текущий остаток
  minStock: integer('min_stock').notNull().default(0), // Минимальный остаток
  imageUrl: text('image_url'), // Фото товара (опционально)
  isActive: boolean('is_active').notNull().default(true), // Статус активности
  createdAt: timestamp('created_at').defaultNow(),
});

// Таблица поставщиков
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(), // Название компании
  contactPerson: text('contact_person'), // Контактное лицо
  phone: text('phone'), // Телефон
  email: text('email'), // Email
  address: text('address'), // Адрес
  comment: text('comment'), // Комментарий
  createdAt: timestamp('created_at').defaultNow(),
});

// Таблица закупок (поступление товара)
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  docNumber: text('doc_number').notNull().unique(), // Номер документа
  date: timestamp('date').notNull().defaultNow(), // Дата
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  totalAmount: doublePrecision('total_amount').notNull().default(0), // Общая сумма
  createdAt: timestamp('created_at').defaultNow(),
});

// Спецификация закупки (товары в документе закупки)
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').references(() => purchases.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(), // Количество
  purchasePrice: doublePrecision('purchase_price').notNull(), // Закупочная цена на момент покупки
});

// Таблица продаж
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  docNumber: text('doc_number').notNull().unique(), // Номер продажи
  date: timestamp('date').notNull().defaultNow(), // Дата
  employeeName: text('employee_name').notNull(), // Имя сотрудника оформившего продажу
  totalAmount: doublePrecision('total_amount').notNull().default(0), // Сумма продажи
  createdAt: timestamp('created_at').defaultNow(),
});

// Спецификация продажи (товары в чеке/продаже)
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(), // Количество
  price: doublePrecision('price').notNull(), // Розничная цена на момент продажи
});

// История движения товаров на складе
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'Приход' | 'Расход' | 'Корректировка' | 'Инвентаризация'
  quantity: integer('quantity').notNull(), // Изменение остатка (+/- или абсолютное для инвентаризации)
  previousStock: integer('previous_stock').notNull(), // Остаток до операции
  newStock: integer('new_stock').notNull(), // Остаток после операции
  docNumber: text('doc_number'), // Номер документа (закупки/продажи/корректировки)
  comment: text('comment'), // Комментарий к корректировке/инвентаризации
  date: timestamp('date').notNull().defaultNow(), // Дата операции
});

// Список сотрудников компании и их роли
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // ФИО
  email: text('email').notNull().unique(), // Email для сопоставления
  role: text('role').notNull().default('Сотрудник'), // 'Администратор' | 'Сотрудник'
  phone: text('phone'), // Телефон
  isActive: boolean('is_active').notNull().default(true), // Активен ли
  createdAt: timestamp('created_at').defaultNow(),
});

// Описание связей между таблицами
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  purchaseItems: many(purchaseItems),
  saleItems: many(saleItems),
  stockMovements: many(stockMovements),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));

export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));
