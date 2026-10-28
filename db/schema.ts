import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('catalog_products', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  description: text('description').notNull(),
  weight: text('weight').notNull(),
  image: text('image').notNull(),
  imageSmall: text('image_small'),
  group: text('group_name').notNull().default('standard'),
  price: integer('price'),
  available: integer('available').notNull().default(1),
  published: integer('published').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  revision: integer('revision').notNull().default(1),
  lastUpdateId: integer('last_update_id'),
  updatedAt: integer('updated_at').notNull(),
});
export const meta = sqliteTable('catalog_meta', {
  key: text('key').primaryKey(), value: text('value').notNull(),
});
export const sessions = sqliteTable('bot_sessions', {
  userId: text('user_id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const updates = sqliteTable('bot_updates', {
  id: integer('id').primaryKey(),
  state: text('state').notNull().default('pending'),
  lease: text('lease').notNull(),
  leaseUntil: integer('lease_until').notNull(),
  response: text('response'),
  delivered: integer('delivered').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});
