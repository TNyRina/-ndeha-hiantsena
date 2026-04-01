import { sqliteTable, text, integer, real, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- Table Category ---
export const categories = sqliteTable('categories', {
    id_category: integer('id_category').primaryKey({ autoIncrement: true }),
    label_category: text('label_category').notNull().unique(),
    rate: integer('rate').notNull(),
}, (table) => [
    check('rate_positive', sql`${table.rate} > 0`),
]);

// --- Table Unit ---
export const units = sqliteTable('units', {
    id_unit: integer('id_unit').primaryKey({ autoIncrement: true }),
    label_unit: text('label_unit').notNull().unique(), 
});

// --- Table Seller ---
export const sellers = sqliteTable('sellers', {
    id_seller: integer('id_seller').primaryKey({ autoIncrement: true }),
    name_seller: text('name_seller').notNull(),
    localisation: text('localisation'), 
});

// --- Table Product ---
export const products = sqliteTable('products', {
    id_product: integer('id_product').primaryKey({ autoIncrement: true }),
    label_product: text('label_product').notNull().unique(),
    id_category: integer('id_category').references(() => categories.id_category),
    id_unit: integer('id_unit').references(() => units.id_unit),
});

// --- Table MarketPrice ---
export const marketPrices = sqliteTable('market_prices', {
    id_market: integer('id_market').primaryKey({ autoIncrement: true }),
    id_product: integer('id_product').notNull().references(() => products.id_product),
    id_seller: integer('id_seller').notNull().references(() => sellers.id_seller),
    price: real('price').notNull().default(0.0), 
});

// --- Table Pannier ---
export const panniers = sqliteTable('panniers', {
    id_pannier: integer('id_pannier').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(), 
    budget: real('budget').notNull().default(0.0), 
    optimized_price: real('optimized_price').notNull().default(0.0),
    description: text('description'),
});

// --- Table ShoppingList ---
export const shoppingLists = sqliteTable('shopping_list', {
    id_shopping: integer('id_shopping').primaryKey({ autoIncrement: true }),
    id_pannier: integer('id_pannier').notNull().references(() => panniers.id_pannier),
    id_market: integer('id_market').references(() => marketPrices.id_market), 
    quantity_requested: real('quantity_requested').notNull(), 
    state: text('state'), 
});