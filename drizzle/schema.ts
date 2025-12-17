import {
  serial,
  integer,
  bigint,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  date,
  json,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'accountant', 'manager', 'viewer']);
export const accountTypeEnum = pgEnum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense', 'fixed_asset']);
export const periodStatusEnum = pgEnum('period_status', ['open', 'under_review', 'closed']);
export const entryTypeEnum = pgEnum('entry_type', ['debit', 'credit']);
export const originEnum = pgEnum('origin', ['manual', 'bank_import', 'system']);
export const nfcCategoryEnum = pgEnum('nfc_category', ['project_70', 'operating_30']);
export const bankEnum = pgEnum('bank', ['banco_brasil', 'caixa_economica', 'other']);
export const fileTypeEnum = pgEnum('file_type', ['csv', 'ofx', 'txt']);
export const importStatusEnum = pgEnum('import_status', ['pending', 'processing', 'completed', 'failed']);
export const entityTypeEnum = pgEnum('entity_type', ['entry', 'account', 'period', 'import', 'rule', 'setting']);
export const actionEnum = pgEnum('action', ['create', 'update', 'delete', 'close', 'reopen']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('open_id', { length: 64 }).notNull().unique(),
  name: text('name'),
  email: varchar('email', { length: 320 }),
  loginMethod: varchar('login_method', { length: 64 }),
  role: roleEnum('role').default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSignedIn: timestamp('last_signed_in').defaultNow().notNull(),
});

export const organizationSettings = pgTable('organization_settings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 18 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 10 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 320 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    type: accountTypeEnum('type').notNull(),
    parentId: integer('parent_id'),
    level: integer('level').default(0).notNull(),
    active: integer('active').default(1).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex('code_idx').on(table.code),
    typeIdx: index('type_idx').on(table.type),
    parentIdx: index('parent_idx').on(table.parentId),
  })
);

export const periods = pgTable(
  'periods',
  {
    id: serial('id').primaryKey(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    status: periodStatusEnum('status').default('open').notNull(),
    openingBalance: bigint('opening_balance', { mode: 'number' }).default(0).notNull(),
    closingBalance: bigint('closing_balance', { mode: 'number' }).default(0).notNull(),
    closedBy: integer('closed_by'),
    closedAt: timestamp('closed_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    periodIdx: uniqueIndex('period_idx').on(table.month, table.year),
    statusIdx: index('status_idx').on(table.status),
  })
);

export const entries = pgTable(
  'entries',
  {
    id: serial('id').primaryKey(),
    periodId: integer('period_id').notNull(),
    accountId: integer('account_id').notNull(),
    type: entryTypeEnum('type').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    transactionDate: date('transaction_date').notNull(),
    description: text('description').notNull(),
    origin: originEnum('origin').default('manual').notNull(),
    bankImportId: integer('bank_import_id'),
    isNfc: integer('is_nfc').default(0).notNull(),
    nfcCategory: nfcCategoryEnum('nfc_category'),
    documentNumber: varchar('document_number', { length: 100 }),
    notes: text('notes'),
    createdBy: integer('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    periodIdx: index('entry_period_idx').on(table.periodId),
    accountIdx: index('entry_account_idx').on(table.accountId),
    dateIdx: index('entry_date_idx').on(table.transactionDate),
    nfcIdx: index('entry_nfc_idx').on(table.isNfc),
    importIdx: index('entry_import_idx').on(table.bankImportId),
  })
);

export const bankImports = pgTable(
  'bank_imports',
  {
    id: serial('id').primaryKey(),
    filename: varchar('filename', { length: 255 }).notNull(),
    bank: bankEnum('bank').notNull(),
    fileType: fileTypeEnum('file_type').notNull(),
    fileUrl: text('file_url'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    totalTransactions: integer('total_transactions').default(0).notNull(),
    classifiedCount: integer('classified_count').default(0).notNull(),
    status: importStatusEnum('status').default('pending').notNull(),
    errorMessage: text('error_message'),
    uploadedBy: integer('uploaded_by').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    statusIdx: index('import_status_idx').on(table.status),
    bankIdx: index('import_bank_idx').on(table.bank),
    uploadedByIdx: index('import_uploaded_by_idx').on(table.uploadedBy),
  })
);

export const classificationRules = pgTable(
  'classification_rules',
  {
    id: serial('id').primaryKey(),
    pattern: varchar('pattern', { length: 255 }).notNull(),
    accountId: integer('account_id').notNull(),
    priority: integer('priority').default(0).notNull(),
    active: integer('active').default(1).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    createdBy: integer('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index('rule_account_idx').on(table.accountId),
    priorityIdx: index('rule_priority_idx').on(table.priority),
    activeIdx: index('rule_active_idx').on(table.active),
  })
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    action: actionEnum('action').notNull(),
    oldValues: json('old_values'),
    newValues: json('new_values'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
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
