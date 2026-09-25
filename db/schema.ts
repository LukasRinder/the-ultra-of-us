import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const activities=sqliteTable('activities',{id:text('id').primaryKey(),kind:text('kind').notNull(),url:text('url'),photoKey:text('photo_key'),submittedAt:text('submitted_at').notNull(),deleted:integer('deleted').notNull().default(0)});
export const attempts=sqliteTable('login_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()});
