import {
  pgTable,
  varchar,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  document: text("document"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  businessType: text("business_type").notNull().default("generic"),
});

export const professionals = pgTable("professionals", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  specialty: text("specialty"),
  photoUrl: text("photo_url"),
  status: text("status").default("ACTIVE"),
  avgDuration: integer("avg_duration").default(20),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  phone: text("phone"),
  birthDate: date("birth_date"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitTypes = pgTable("visit_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  visitTypeId: uuid("visit_type_id").references(() => visitTypes.id),
  visitorName: text("visitor_name"),
  arrivedAt: timestamp("arrived_at").defaultNow(),
  status: text("status").default("CHECKED_IN"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  valor: numeric("valor"),
  dataVencimento: date("data_vencimento").notNull(),
  dataPagamento: date("data_pagamento"),
  status: text("status").default("PENDING"),
  metodoPagamento: text("metodo_pagamento"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  companyId: uuid("company_id").references(() => companies.id),
  role: text("role").default("admin"),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ================================
   AGENDAMENTOS 
================================ */

/* AGENDA REAL (MARCAÇÕES) */

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  clientId: uuid("client_id").references(() => clients.id),

  scheduledTime: timestamp("scheduled_time").notNull(),
  confirmedAt: timestamp("confirmed_at"),

  status: text("status").default("PENDING"), // PENDING | CONFIRMED | CANCELLED | NO_SHOW

  createdAt: timestamp("created_at").defaultNow(),
});

/* DISPONIBILIDADE FIXA DO MÉDICO */

export const professionalSchedules = pgTable("professional_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),

  professionalId: uuid("professional_id").references(() => professionals.id),

  weekday: integer("weekday").notNull(), // 0-6
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "12:00"

  createdAt: timestamp("created_at").defaultNow(),
});

/* GOVERNANÇA DA companyA */

export const schedulingConfig = pgTable("scheduling_config", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").notNull(),

  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),

  bufferMinutes: integer("buffer_minutes").notNull().default(5),

  allowOverbooking: boolean("allow_overbooking").default(false),

  maxAdvanceDays: integer("max_advance_days").notNull().default(30),

  createdAt: timestamp("created_at").defaultNow(),
});

/* ================================   
================================ */

/* ================================
   EMERGÊNCIA
================================ */

/*  1. TIPOS / CLASSES DE EMERGÊNCIA */

export const emergencyClasses = pgTable("emergency_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: text("name").notNull(), // Ex: Parada cardiorrespiratória
  level: integer("level").notNull(), // 1=crítico, 5=baixo

  color: text("color"),
  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),
});

/*    POLÍTICAS DE AÇÃO  */
export const emergencyPolicies = pgTable("emergency_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  actionType: text("action_type").notNull(),
  // AUTO_RESCHEDULE | FORCE_INSERT | CLEAR_SLOTS

  maxDelayMinutes: integer("max_delay_minutes"),
  notifyChannels: text("notify_channels").array(),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/* REGRAS DINÂMICAS (ENGINE) */
export const emergencyRules = pgTable("emergency_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true),

  config: jsonb("config").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/*    EVENTOS DE EMERGÊNCIA */
export const emergencyEvents = pgTable("emergency_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  triggeredBy: uuid("triggered_by_client"),

  createdAt: timestamp("created_at").defaultNow(),
});

/*     LOGS / AUDITORIA  */
export const emergencyLogs = pgTable("emergency_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id").references(
    () => emergencyClasses.id
  ),

  policyId: uuid("policy_id").references(() => emergencyPolicies.id),

  triggeredBy: text("triggered_by").notNull(),
  // SYSTEM | client | TOTEM | N8N

  status: text("status").default("PENDING"),

  payload: jsonb("payload"),

  createdAt: timestamp("created_at").defaultNow(),
});
/* ================================   
================================ */

export const outbox = pgTable("outbox", {
  id: uuid("id").defaultRandom().primaryKey(),

  // ex: "appointment", "webhook", "scheduling"
  aggregateType: text("aggregate_type").notNull(),

  // id relacionado
  aggregateId: uuid("aggregate_id").notNull(),

  // ex: "created", "updated", "cancelled"
  eventType: text("event_type").notNull(),

  // payload completo do evento
  payload: jsonb("payload").notNull(),

  // PENDING | SENT | FAILED | RETRYING | DEAD
  status: text("status").default("PENDING").notNull(),

  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),

  nextRetryAt: timestamp("next_retry_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).defaultNow(),
});

/* ================================
   Z-API — INTEGRAÇÃO OFICIAL
================================ */

export const zapiAccounts = pgTable("zapi_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id")
    .notNull()

    .references(() => tenants.id),

  name: text("name").notNull(), // Ex: "Conta principal"
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | DISCONNECTED | ERROR

  // chave fornecida pela Z-API
  instanceId: text("instance_id").notNull(),

  // token da instância
  token: text("token").notNull(),

  // número conectado
  phoneNumber: text("phone_number"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zapiNumbers = pgTable("zapi_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  label: text("label").notNull(), // Ex: "Recepção", "Exames", "Clínica X"

  phoneNumber: text("phone_number").notNull(),
  status: text("status").default("ACTIVE"), // ACTIVE | DISCONNECTED | ERROR
  isDefault: boolean("is_default").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zapiEvents = pgTable("zapi_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  eventType: text("event_type").notNull(), // message.received, status.update, etc.
  payload: jsonb("payload").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const zapiMessages = pgTable("zapi_messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  // telefone de destino
  to: text("to").notNull(),

  // corpo da mensagem
  body: text("body").notNull(),

  // resposta da Z-API
  response: jsonb("response"),

  status: text("status").default("PENDING").notNull(), // PENDING | SENT | ERROR

  createdAt: timestamp("created_at").defaultNow(),
});
