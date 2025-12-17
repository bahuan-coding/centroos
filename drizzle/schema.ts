import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  openId: varchar('openId', { length: 64 }).notNull().unique(),
  name: text('name'),
  email: varchar('email', { length: 320 }),
  loginMethod: varchar('loginMethod', { length: 64 }),
  role: mysqlEnum('role', ['admin', 'accountant', 'manager', 'viewer']).default('viewer').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp('lastSignedIn').defaultNow().notNull(),
});

export const organizationSettings = mysqlTable('organization_settings', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zipCode', { length: 10 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 320 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export const accounts = mysqlTable(
  'accounts',
  {
    id: int('id').autoincrement().primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    type: mysqlEnum('type', ['asset', 'liability', 'equity', 'revenue', 'expense', 'fixed_asset']).notNull(),
    parentId: int('parentId'),
    level: int('level').default(0).notNull(),
    active: int('active').default(1).notNull(),
    description: text('description'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex('code_idx').on(table.code),
    typeIdx: index('type_idx').on(table.type),
    parentIdx: index('parent_idx').on(table.parentId),
  })
);

export const periods = mysqlTable(
  'periods',
  {
    id: int('id').autoincrement().primaryKey(),
    month: int('month').notNull(),
    year: int('year').notNull(),
    status: mysqlEnum('status', ['open', 'under_review', 'closed']).default('open').notNull(),
    openingBalance: bigint('openingBalance', { mode: 'number' }).default(0).notNull(),
    closingBalance: bigint('closingBalance', { mode: 'number' }).default(0).notNull(),
    closedBy: int('closedBy'),
    closedAt: timestamp('closedAt'),
    notes: text('notes'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    periodIdx: uniqueIndex('period_idx').on(table.month, table.year),
    statusIdx: index('status_idx').on(table.status),
  })
);

export const entries = mysqlTable(
  'entries',
  {
    id: int('id').autoincrement().primaryKey(),
    periodId: int('periodId').notNull(),
    accountId: int('accountId').notNull(),
    type: mysqlEnum('type', ['debit', 'credit']).notNull(),
    amountCents: bigint('amountCents', { mode: 'number' }).notNull(),
    transactionDate: date('transactionDate').notNull(),
    description: text('description').notNull(),
    origin: mysqlEnum('origin', ['manual', 'bank_import', 'system']).default('manual').notNull(),
    bankImportId: int('bankImportId'),
    isNfc: int('isNfc').default(0).notNull(),
    nfcCategory: mysqlEnum('nfcCategory', ['project_70', 'operating_30']),
    documentNumber: varchar('documentNumber', { length: 100 }),
    notes: text('notes'),
    createdBy: int('createdBy').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    periodIdx: index('entry_period_idx').on(table.periodId),
    accountIdx: index('entry_account_idx').on(table.accountId),
    dateIdx: index('entry_date_idx').on(table.transactionDate),
    nfcIdx: index('entry_nfc_idx').on(table.isNfc),
    importIdx: index('entry_import_idx').on(table.bankImportId),
  })
);

export const bankImports = mysqlTable(
  'bank_imports',
  {
    id: int('id').autoincrement().primaryKey(),
    filename: varchar('filename', { length: 255 }).notNull(),
    bank: mysqlEnum('bank', ['banco_brasil', 'caixa_economica', 'other']).notNull(),
    fileType: mysqlEnum('fileType', ['pdf', 'csv', 'ofx']).notNull(),
    fileUrl: text('fileUrl'),
    startDate: date('startDate'),
    endDate: date('endDate'),
    totalTransactions: int('totalTransactions').default(0).notNull(),
    classifiedCount: int('classifiedCount').default(0).notNull(),
    status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending').notNull(),
    errorMessage: text('errorMessage'),
    uploadedBy: int('uploadedBy').notNull(),
    uploadedAt: timestamp('uploadedAt').defaultNow().notNull(),
    processedAt: timestamp('processedAt'),
  },
  (table) => ({
    statusIdx: index('import_status_idx').on(table.status),
    bankIdx: index('import_bank_idx').on(table.bank),
    uploadedByIdx: index('import_uploaded_by_idx').on(table.uploadedBy),
  })
);

export const classificationRules = mysqlTable(
  'classification_rules',
  {
    id: int('id').autoincrement().primaryKey(),
    pattern: varchar('pattern', { length: 255 }).notNull(),
    accountId: int('accountId').notNull(),
    priority: int('priority').default(0).notNull(),
    active: int('active').default(1).notNull(),
    usageCount: int('usageCount').default(0).notNull(),
    createdBy: int('createdBy').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    accountIdx: index('rule_account_idx').on(table.accountId),
    priorityIdx: index('rule_priority_idx').on(table.priority),
    activeIdx: index('rule_active_idx').on(table.active),
  })
);

export const auditLog = mysqlTable(
  'audit_log',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('userId').notNull(),
    entityType: mysqlEnum('entityType', ['entry', 'account', 'period', 'import', 'rule', 'setting']).notNull(),
    entityId: int('entityId').notNull(),
    action: mysqlEnum('action', ['create', 'update', 'delete', 'close', 'reopen']).notNull(),
    oldValues: json('oldValues'),
    newValues: json('newValues'),
    ipAddress: varchar('ipAddress', { length: 45 }),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('audit_user_idx').on(table.userId),
    entityIdx: index('audit_entity_idx').on(table.entityType, table.entityId),
    actionIdx: index('audit_action_idx').on(table.action),
    dateIdx: index('audit_date_idx').on(table.createdAt),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type InsertOrganizationSettings = typeof organizationSettings.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Period = typeof periods.$inferSelect;
export type InsertPeriod = typeof periods.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;
export type BankImport = typeof bankImports.$inferSelect;
export type InsertBankImport = typeof bankImports.$inferInsert;
export type ClassificationRule = typeof classificationRules.$inferSelect;
export type InsertClassificationRule = typeof classificationRules.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

