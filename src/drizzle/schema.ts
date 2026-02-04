// src/drizzle/schema.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  numeric,
  jsonb,
  varchar,
  // time, // se você quiser evoluir start_time/end_time para time no futuro
  index,
} from "drizzle-orm/pg-core";

/* ================================
   MULTI-TENANT / ORGANIZAÇÃO
================================ */

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),

  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),

  // antes: ativo
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),

  name: text("name").notNull(),

  // antes: document
  documentNumber: text("document_number"),

  address: text("address"),
  phone: text("phone"),
  email: text("email"),

  businessType: text("business_type").notNull().default("generic"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable("profiles", {
  // id aqui normalmente é o user_id do auth (Supabase auth.users)
  id: uuid("id").primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),
  companyId: uuid("company_id").references(() => companies.id),

  role: text("role").default("admin"),
  name: text("name"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   CLÍNICA / CADASTROS
================================ */

export const professionals = pgTable("professionals", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),

  name: text("name").notNull(),
  specialty: text("specialty"),
  photoUrl: text("photo_url"),

  // manter, mas padronize valores lowercase no código futuramente
  status: text("status").default("active"),

  // antes: avg_duration
  avgDurationMinutes: integer("avg_duration_minutes").default(20),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),

  name: text("name").notNull(),

  // antes: phone (sugestão para WhatsApp real)
  phoneE164: text("phone_e164"),

  birthDate: date("birth_date"),
  email: text("email"),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const visitTypes = pgTable("visit_types", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),

  name: text("name").notNull(),
  description: text("description"),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Nota: "visits" parece ser check-in/totem. Mantive nome pra não quebrar.
// Se quiser renomear depois: visits -> checkins
export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  visitTypeId: uuid("visit_type_id").references(() => visitTypes.id),

  visitorName: text("visitor_name"),

  arrivedAt: timestamp("arrived_at", { withTimezone: true }).defaultNow(),
  status: text("status").default("checked_in"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   PAGAMENTOS (padronizado EN)
================================ */

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),

  // antes: valor
  amount: numeric("amount"),

  // antes: dataVencimento
  dueDate: date("due_date").notNull(),

  // antes: dataPagamento
  paidDate: date("paid_date"),

  status: text("status").default("pending"),

  // antes: metodoPagamento
  paymentMethod: text("payment_method"),

  currency: text("currency").default("BRL"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   AGENDAMENTOS
================================ */

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  clientId: uuid("client_id").references(() => clients.id),

  // recomendado timestamptz
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),

  // padronize valores no código: pending/confirmed/cancelled/no_show
  status: text("status").default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const professionalSchedules = pgTable("professional_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),

  professionalId: uuid("professional_id").references(() => professionals.id),

  weekday: integer("weekday").notNull(), // 0-6
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "12:00"

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const schedulingConfig = pgTable("scheduling_config", {
  id: uuid("id").defaultRandom().primaryKey(),

  // agora com FK de verdade
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),

  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),
  bufferMinutes: integer("buffer_minutes").notNull().default(5),

  allowOverbooking: boolean("allow_overbooking").default(false),
  maxAdvanceDays: integer("max_advance_days").notNull().default(30),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   EMERGÊNCIA
================================ */

export const emergencyClasses = pgTable("emergency_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: text("name").notNull(),
  level: integer("level").notNull(), // 1 crítico, 5 baixo

  color: text("color"),
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emergencyPolicies = pgTable("emergency_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  actionType: text("action_type").notNull(), // auto_reschedule | force_insert | clear_slots

  maxDelayMinutes: integer("max_delay_minutes"),
  notifyChannels: text("notify_channels").array(),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emergencyRules = pgTable("emergency_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true),

  config: jsonb("config").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emergencyEvents = pgTable("emergency_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  triggeredByClientId: uuid("triggered_by_client_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emergencyLogs = pgTable("emergency_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id").references(
    () => emergencyClasses.id,
  ),
  policyId: uuid("policy_id").references(() => emergencyPolicies.id),

  triggeredBy: text("triggered_by").notNull(), // system | client | totem | n8n
  status: text("status").default("pending"),

  payload: jsonb("payload"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   OUTBOX (padrão robusto)
================================ */

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    aggregateType: text("aggregate_type").notNull(), // appointment, client, ...
    aggregateId: uuid("aggregate_id").notNull(),

    // recomendado: "appointment.created" (lowercase + dot)
    eventType: text("event_type").notNull(),

    payload: jsonb("payload").notNull(),

    // IMPORTANT: lowercase, compatível com seu chk no banco
    status: text("status").notNull().default("pending"),

    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    dispatchIdx: index("outbox_dispatch_idx").on(
      t.status,
      t.nextRetryAt,
      t.createdAt,
    ),
  }),
);

/* ================================
   Z-API
================================ */

export const zapiAccounts = pgTable("zapi_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),

  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active|disconnected|error

  instanceId: text("instance_id").notNull(),

  // WARNING: sensível (ideal criptografar no futuro)
  token: text("token").notNull(),

  phoneNumber: text("phone_number"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const zapiNumbers = pgTable("zapi_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  label: text("label").notNull(),
  phoneNumber: text("phone_number").notNull(),

  status: text("status").default("active"),
  isDefault: boolean("is_default").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const zapiEvents = pgTable("zapi_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const zapiMessages = pgTable("zapi_messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  zapiAccountId: uuid("account_id")
    .notNull()
    .references(() => zapiAccounts.id),

  // antes: to
  toPhone: text("to_phone").notNull(),

  // antes: body
  body: text("body").notNull(),

  response: jsonb("response"),

  status: text("status").default("pending").notNull(), // pending|sent|error

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   WHATSAPP (Provider-Agnostic)
================================ */

export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // meta | mock | zapi (legado)
  provider: varchar("provider", { length: 32 }).notNull(),

  // pending | connected | revoked
  status: varchar("status", { length: 32 }).notNull().default("pending"),

  // Tudo que for específico do provider fica aqui:
  // meta => { phone_number_id, waba_id, access_token }
  // mock => { }
  providerConfig: jsonb("provider_config").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ================================
   MESSAGE LOGS (Audit Trail)
================================ */

export const messageLogs = pgTable("message_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  channel: varchar("channel", { length: 32 }).notNull(), // whatsapp
  provider: varchar("provider", { length: 32 }).notNull(), // meta | mock

  toPhone: varchar("to_phone", { length: 32 }).notNull(),

  body: text("body").notNull(),

  // queued | sent | failed
  status: varchar("status", { length: 32 }).notNull(),

  providerMessageId: text("provider_message_id"),
  error: text("error"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
