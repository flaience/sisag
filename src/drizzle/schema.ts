// src/drizzle/schema.ts
import { sql } from "drizzle-orm";
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
  pgEnum,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// opcional: enums (melhora integridade)
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "CANCELLED",
  "RESCHEDULED",
  "COMPLETED",
  "NO_SHOW",
]);

export const bookingEventTypeEnum = pgEnum("booking_event_type", [
  "booking.created",
  "booking.confirmed",
  "booking.arrived",
  "booking.started",
  "booking.cancelled",
  "booking.rescheduled",
  "booking.completed",
  "booking.no_show",
  "booking.slot_suggested",
  "booking.recreated_from_cancelled",
  "booking.recreated_origin",
  "automation.precheckin.sent",
  "automation.booking_reminder.responded",
  "automation.booking_followup.responded",
  "automation.booking_recovery.opened",
  "automation.booking_recovery.updated",
  "automation.booking_recovery.closed",
  "automation.followup.sent",
  "automation.reactivation.sent",
]);

export const bookingActorEnum = pgEnum("booking_actor", [
  "whatsapp",
  "admin",
  "system",
  "n8n",
]);

export const automationJobTypeEnum = pgEnum("automation_job_type", [
  "precheckin",
  "booking_reminder",
  "followup",
  "reactivation",
]);

export const automationJobStatusEnum = pgEnum("automation_job_status", [
  "pending",
  "processing",
  "done",
  "failed",
  "cancelled",
]);

export const companyUserRoleEnum = pgEnum("company_user_role", [
  "owner",
  "admin",
  "staff",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const commercialClientStatusEnum = pgEnum(
  "commercial_client_status",
  ["prospect", "onboarding", "active", "suspended", "closed"],
);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "trial",
  "active",
  "past_due",
  "suspended",
  "cancelled",
]);

export const subscriptionProvisioningStatusEnum = pgEnum(
  "subscription_provisioning_status",
  ["pending", "processing", "completed", "failed"],
);

export const subscriptionUserRoleEnum = pgEnum("subscription_user_role", [
  "owner",
  "billing",
  "administrator",
]);

export const commercialOnboardingStatusEnum = pgEnum(
  "commercial_onboarding_status",
  ["pending", "in_progress", "blocked", "completed", "cancelled"],
);

export const commercialOnboardingStepStatusEnum = pgEnum(
  "commercial_onboarding_step_status",
  ["pending", "in_progress", "blocked", "completed", "skipped", "cancelled"],
);

export const commercialOnboardingExecutorTypeEnum = pgEnum(
  "commercial_onboarding_executor_type",
  ["human", "agent", "system", "n8n"],
);

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

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   CONTROLE COMERCIAL / ASSINATURAS
================================ */

export const commercialClients = pgTable(
  "commercial_clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    documentNumber: varchar("document_number", { length: 32 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    whatsapp: varchar("whatsapp", { length: 32 }),

    status: commercialClientStatusEnum("status")
      .notNull()
      .default("onboarding"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    documentUq: uniqueIndex("commercial_clients_document_uq").on(
      t.documentNumber,
    ),
    emailIdx: index("commercial_clients_email_idx").on(t.email),
    statusIdx: index("commercial_clients_status_idx").on(t.status),
    documentFormatCheck: check(
      "commercial_clients_document_format_check",
      sql`${t.documentNumber} ~ '^[0-9]{11}$|^[0-9]{14}$'`,
    ),
  }),
).enableRLS();

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    commercialClientId: uuid("commercial_client_id")
      .notNull()
      .references(() => commercialClients.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),

    planCode: varchar("plan_code", { length: 64 })
      .notNull()
      .default("standard"),
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    provisioningStatus: subscriptionProvisioningStatusEnum(
      "provisioning_status",
    )
      .notNull()
      .default("pending"),

    trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
    lastProvisioningError: text("last_provisioning_error"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    clientUq: uniqueIndex("subscriptions_commercial_client_uq").on(
      t.commercialClientId,
    ),
    tenantUq: uniqueIndex("subscriptions_tenant_uq").on(t.tenantId),
    statusIdx: index("subscriptions_status_idx").on(t.status),
    provisioningStatusIdx: index(
      "subscriptions_provisioning_status_idx",
    ).on(t.provisioningStatus),
    trialPeriodCheck: check(
      "subscriptions_trial_period_check",
      sql`${t.trialEndsAt} IS NULL OR ${t.trialStartsAt} IS NULL OR ${t.trialEndsAt} > ${t.trialStartsAt}`,
    ),
  }),
).enableRLS();

export const subscriptionUsers = pgTable(
  "subscription_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    commercialClientId: uuid("commercial_client_id")
      .notNull()
      .references(() => commercialClients.id, { onDelete: "cascade" }),
    // auth.users.id; vínculo lógico para não acoplar o schema público ao auth.
    userId: uuid("user_id").notNull(),

    role: subscriptionUserRoleEnum("role").notNull().default("owner"),
    isActive: boolean("is_active").notNull().default(true),

    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    clientUserUq: uniqueIndex("subscription_users_client_user_uq").on(
      t.commercialClientId,
      t.userId,
    ),
    userIdx: index("subscription_users_user_idx").on(t.userId),
    clientActiveIdx: index("subscription_users_client_active_idx").on(
      t.commercialClientId,
      t.isActive,
    ),
  }),
).enableRLS();

export const commercialOnboardings = pgTable(
  "commercial_onboardings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    commercialClientId: uuid("commercial_client_id")
      .notNull()
      .references(() => commercialClients.id, { onDelete: "restrict" }),
    status: commercialOnboardingStatusEnum("status")
      .notNull()
      .default("pending"),
    currentStepCode: varchar("current_step_code", { length: 64 }),
    blockedReason: text("blocked_reason"),

    input: jsonb("input").notNull().default({}),
    result: jsonb("result"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    clientUq: uniqueIndex("commercial_onboardings_client_uq").on(
      t.commercialClientId,
    ),
    statusIdx: index("commercial_onboardings_status_idx").on(t.status),
    currentStepIdx: index("commercial_onboardings_current_step_idx").on(
      t.currentStepCode,
    ),
    stepCodeFormatCheck: check(
      "commercial_onboardings_step_code_format_check",
      sql`${t.currentStepCode} IS NULL OR ${t.currentStepCode} ~ '^[a-z0-9][a-z0-9_]*$'`,
    ),
  }),
).enableRLS();

export const commercialPostActivationDueWorkItems = pgTable(
  "commercial_post_activation_due_work_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    onboardingId: uuid("onboarding_id")
      .notNull()
      .references(() => commercialOnboardings.id, { onDelete: "cascade" }),
    milestoneCode: varchar("milestone_code", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    deferredCount: integer("deferred_count").notNull().default(0),
    firstDeferredAt: timestamp("first_deferred_at", { withTimezone: true }),
    lastDeferredAt: timestamp("last_deferred_at", { withTimezone: true }),
    lastDeferralReason: varchar("last_deferral_reason", { length: 40 }),
    escalationRequired: boolean("escalation_required").notNull().default(false),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 200 }),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    onboardingMilestoneUq: uniqueIndex(
      "commercial_pa_due_items_onboarding_milestone_uq",
    ).on(t.onboardingId, t.milestoneCode),
    claimableIdx: index("commercial_pa_due_items_claimable_idx")
      .on(t.availableAt, t.dueAt, t.priority, t.id)
      .where(sql`status IN ('scheduled', 'failed')`),
    processingExpiryIdx: index(
      "commercial_pa_due_items_processing_expiry_idx",
    ).on(t.lockedUntil, t.id).where(sql`status = 'processing'`),
    outstandingIdx: index(
      "commercial_pa_due_items_outstanding_idx",
    ).on(
      t.status,
      t.dueAt,
      t.availableAt,
      t.lockedUntil,
      t.attempts,
      t.id,
    ).where(sql`status <> 'completed'`),
    completedAtIdx: index(
      "commercial_pa_due_items_completed_at_idx",
    ).on(t.completedAt, t.id).where(sql`status = 'completed'`),
    escalatedIdx: index(
      "commercial_pa_due_items_escalated_idx",
    ).on(t.firstDeferredAt, t.id)
      .where(sql`${t.escalationRequired} = true AND ${t.status} <> 'completed'`),
    statusCheck: check(
      "commercial_post_activation_due_items_status_check",
      sql`${t.status} IN ('scheduled', 'processing', 'completed', 'failed')`,
    ),
    milestoneCodeCheck: check(
      "commercial_post_activation_due_items_milestone_code_check",
      sql`${t.milestoneCode} ~ '^[a-z0-9][a-z0-9_]*$'`,
    ),
    priorityCheck: check(
      "commercial_post_activation_due_items_priority_check",
      sql`${t.priority} BETWEEN 0 AND 1000`,
    ),
    attemptsCheck: check(
      "commercial_post_activation_due_items_attempts_check",
      sql`${t.attempts} >= 0`,
    ),
    deferralCountCheck: check(
      "commercial_post_activation_due_items_deferral_count_check",
      sql`${t.deferredCount} >= 0`,
    ),
    deferralHistoryCheck: check(
      "commercial_post_activation_due_items_deferral_history_check",
      sql`(
        (${t.deferredCount} = 0 AND ${t.firstDeferredAt} IS NULL
          AND ${t.lastDeferredAt} IS NULL AND ${t.lastDeferralReason} IS NULL
          AND ${t.escalationRequired} = false)
        OR
        (${t.deferredCount} > 0 AND ${t.firstDeferredAt} IS NOT NULL
          AND ${t.lastDeferredAt} IS NOT NULL
          AND ${t.lastDeferredAt} >= ${t.firstDeferredAt}
          AND ${t.lastDeferralReason} IN ('business_wait',
            'deferral_limit_reached', 'wait_deadline_reached')
          AND (
            (${t.escalationRequired} = false
              AND ${t.lastDeferralReason} = 'business_wait')
            OR
            (${t.escalationRequired} = true
              AND ${t.lastDeferralReason} IN ('deferral_limit_reached',
                'wait_deadline_reached'))
          ))
      )`,
    ),
    lockCheck: check(
      "commercial_post_activation_due_items_lock_check",
      sql`(
        (${t.status} = 'processing' AND ${t.lockedUntil} IS NOT NULL
          AND ${t.lockedBy} IS NOT NULL AND length(trim(${t.lockedBy})) > 0)
        OR
        (${t.status} <> 'processing' AND ${t.lockedUntil} IS NULL
          AND ${t.lockedBy} IS NULL)
      )`,
    ),
    completionCheck: check(
      "commercial_post_activation_due_items_completion_check",
      sql`(${t.status} = 'completed') = (${t.completedAt} IS NOT NULL)`,
    ),
  }),
).enableRLS();

export const commercialPostActivationRunnerRuns = pgTable(
  "commercial_post_activation_runner_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runnerKey: varchar("runner_key", { length: 100 }).notNull(),
    executionKey: varchar("execution_key", { length: 200 }).notNull(),
    summary: jsonb("summary").notNull(),
    metrics: jsonb("metrics").notNull(),
    capacity: jsonb("capacity"),
    capacityRecordedAt: timestamp("capacity_recorded_at", { withTimezone: true }),
    fairness: jsonb("fairness"),
    fairnessRecordedAt: timestamp("fairness_recorded_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    executionUq: uniqueIndex(
      "commercial_post_activation_runner_runs_execution_uq",
    ).on(t.executionKey),
    runnerExecutedIdx: index(
      "commercial_post_activation_runner_runs_runner_executed_idx",
    ).on(t.runnerKey, t.executedAt),
    runnerKeyFormatCheck: check(
      "commercial_post_activation_runner_runs_runner_key_format_check",
      sql`${t.runnerKey} ~ '^[a-z0-9][a-z0-9_-]*$'`,
    ),
    executionKeyNotBlankCheck: check(
      "commercial_post_activation_runner_runs_execution_key_not_blank_check",
      sql`length(trim(${t.executionKey})) > 0`,
    ),
  }),
).enableRLS();

export const commercialPostActivationRunnerLeases = pgTable(
  "commercial_post_activation_runner_leases",
  {
    runnerKey: varchar("runner_key", { length: 100 }).primaryKey(),
    ownerKey: varchar("owner_key", { length: 200 }).notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    expiresIdx: index(
      "commercial_post_activation_runner_leases_expires_idx",
    ).on(t.expiresAt),
    runnerKeyCheck: check(
      "commercial_post_activation_runner_leases_runner_key_check",
      sql`${t.runnerKey} ~ '^[a-z0-9][a-z0-9_-]*$'`,
    ),
    ownerKeyCheck: check(
      "commercial_post_activation_runner_leases_owner_key_check",
      sql`length(trim(${t.ownerKey})) > 0`,
    ),
    expiryCheck: check(
      "commercial_post_activation_runner_leases_expiry_check",
      sql`${t.expiresAt} > ${t.acquiredAt}`,
    ),
  }),
).enableRLS();

export const commercialPostActivationAlertOccurrences = pgTable(
  "commercial_post_activation_alert_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alertKey: varchar("alert_key", { length: 500 }).notNull(),
    onboardingId: uuid("onboarding_id")
      .notNull()
      .references(() => commercialOnboardings.id, { onDelete: "cascade" }),
    commercialClientId: uuid("commercial_client_id")
      .notNull()
      .references(() => commercialClients.id, { onDelete: "cascade" }),
    severity: varchar("severity", { length: 20 }).notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    alertUq: uniqueIndex(
      "commercial_post_activation_alert_occurrences_alert_uq",
    ).on(t.alertKey),
    activeIdx: index(
      "commercial_post_activation_alert_occurrences_active_idx",
    ).on(t.resolvedAt, t.severity, t.openedAt),
    onboardingIdx: index(
      "commercial_post_activation_alert_occurrences_onboarding_idx",
    ).on(t.onboardingId, t.openedAt),
    alertKeyNotBlankCheck: check(
      "commercial_post_activation_alert_occurrences_alert_key_not_blank_check",
      sql`length(trim(${t.alertKey})) > 0`,
    ),
    severityCheck: check(
      "commercial_post_activation_alert_occurrences_severity_check",
      sql`${t.severity} IN ('critical', 'high')`,
    ),
    categoryCheck: check(
      "commercial_post_activation_alert_occurrences_category_check",
      sql`${t.category} IN ('human_escalation', 'milestone_overdue')`,
    ),
    observedOrderCheck: check(
      "commercial_post_activation_alert_occurrences_observed_order_check",
      sql`${t.lastObservedAt} >= ${t.openedAt}`,
    ),
    resolvedOrderCheck: check(
      "commercial_post_activation_alert_occurrences_resolved_order_check",
      sql`${t.resolvedAt} IS NULL OR ${t.resolvedAt} >= ${t.openedAt}`,
    ),
  }),
).enableRLS();

export const commercialPostActivationAlertSlaSignalOccurrences = pgTable(
  "commercial_post_activation_alert_sla_signal_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    signalKey: varchar("signal_key", { length: 600 }).notNull(),
    alertKey: varchar("alert_key", { length: 500 })
      .notNull()
      .references(() => commercialPostActivationAlertOccurrences.alertKey, { onDelete: "cascade" }),
    signalType: varchar("signal_type", { length: 40 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    signalUq: uniqueIndex(
      "commercial_post_activation_alert_sla_signal_occurrences_signal_uq",
    ).on(t.signalKey),
    activeIdx: index(
      "commercial_post_activation_alert_sla_signal_occurrences_active_idx",
    ).on(t.resolvedAt, t.severity, t.firstObservedAt),
    alertIdx: index(
      "commercial_post_activation_alert_sla_signal_occurrences_alert_idx",
    ).on(t.alertKey, t.firstObservedAt),
    keyNotBlankCheck: check(
      "commercial_post_activation_alert_sla_signal_occurrences_key_not_blank_check",
      sql`length(trim(${t.signalKey})) > 0`,
    ),
    typeCheck: check(
      "commercial_post_activation_alert_sla_signal_occurrences_type_check",
      sql`${t.signalType} IN ('acknowledgement_breached', 'resolution_breached')`,
    ),
    severityCheck: check(
      "commercial_post_activation_alert_sla_signal_occurrences_severity_check",
      sql`${t.severity} IN ('critical', 'high')`,
    ),
    observedOrderCheck: check(
      "commercial_post_activation_alert_sla_signal_occurrences_observed_order_check",
      sql`${t.lastObservedAt} >= ${t.firstObservedAt}`,
    ),
    resolvedOrderCheck: check(
      "commercial_post_activation_alert_sla_signal_occurrences_resolved_order_check",
      sql`${t.resolvedAt} IS NULL OR ${t.resolvedAt} >= ${t.firstObservedAt}`,
    ),
  }),
).enableRLS();

export const commercialOnboardingSteps = pgTable(
  "commercial_onboarding_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    onboardingId: uuid("onboarding_id")
      .notNull()
      .references(() => commercialOnboardings.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    position: integer("position").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    status: commercialOnboardingStepStatusEnum("status")
      .notNull()
      .default("pending"),

    executorType: commercialOnboardingExecutorTypeEnum("executor_type")
      .notNull()
      .default("system"),
    executorId: varchar("executor_id", { length: 200 }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),

    input: jsonb("input").notNull().default({}),
    result: jsonb("result"),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    onboardingCodeUq: uniqueIndex(
      "commercial_onboarding_steps_onboarding_code_uq",
    ).on(t.onboardingId, t.code),
    onboardingPositionUq: uniqueIndex(
      "commercial_onboarding_steps_onboarding_position_uq",
    ).on(t.onboardingId, t.position),
    onboardingStatusIdx: index(
      "commercial_onboarding_steps_onboarding_status_idx",
    ).on(t.onboardingId, t.status),
    executorIdx: index("commercial_onboarding_steps_executor_idx").on(
      t.executorType,
      t.executorId,
    ),
    codeFormatCheck: check(
      "commercial_onboarding_steps_code_format_check",
      sql`${t.code} ~ '^[a-z0-9][a-z0-9_]*$'`,
    ),
    positionCheck: check(
      "commercial_onboarding_steps_position_check",
      sql`${t.position} > 0`,
    ),
    attemptsCheck: check(
      "commercial_onboarding_steps_attempts_check",
      sql`${t.attempts} >= 0`,
    ),
  }),
).enableRLS();

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),

  name: text("name").notNull(),

  documentNumber: text("document_number"),

  address: text("address"),
  phone: text("phone"),
  email: text("email"),

  businessType: text("business_type").notNull().default("generic"),

  tradeName: varchar("trade_name", { length: 160 }),
  logoPath: varchar("logo_path", { length: 500 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const companyUnits = pgTable(
  "company_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    timeZone: varchar("time_zone", { length: 80 }).notNull().default("America/Sao_Paulo"),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    postalCode: varchar("postal_code", { length: 20 }),
    street: varchar("street", { length: 200 }),
    number: varchar("number", { length: 30 }),
    complement: varchar("complement", { length: 120 }),
    district: varchar("district", { length: 120 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 80 }),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("BR"),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    companyCodeUq: uniqueIndex("company_units_company_code_uq").on(t.companyId, t.code),
    companyActiveIdx: index("company_units_company_active_idx").on(t.companyId, t.active, t.name),
    companyDefaultUq: uniqueIndex("company_units_company_default_uq")
      .on(t.companyId)
      .where(sql`${t.isDefault} = true`),
    codeCheck: check("company_units_code_check", sql`${t.code} ~ '^[a-z0-9][a-z0-9_-]*$'`),
    nameCheck: check("company_units_name_check", sql`length(trim(${t.name})) >= 2`),
    timeZoneCheck: check("company_units_time_zone_check", sql`length(trim(${t.timeZone})) > 0`),
    countryCodeCheck: check("company_units_country_code_check", sql`${t.countryCode} ~ '^[A-Z]{2}$'`),
  }),
).enableRLS();

export const profiles = pgTable("profiles", {
  // normalmente = auth.users.id
  id: uuid("id").primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),
  companyId: uuid("company_id").references(() => companies.id),

  role: text("role").default("admin"),
  name: text("name"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const companyUsers = pgTable(
  "company_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, {
        onDelete: "cascade",
      }),

    // auth.users.id
    userId: uuid("user_id").notNull(),

    role: companyUserRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),

    invitedByUserId: uuid("invited_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    companyUserUq: uniqueIndex("company_users_company_user_uq").on(
      t.companyId,
      t.userId,
    ),
    companyIdx: index("company_users_company_idx").on(t.companyId),
    userIdx: index("company_users_user_idx").on(t.userId),
    tenantIdx: index("company_users_tenant_idx").on(t.tenantId),
  }),
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, {
        onDelete: "cascade",
      }),

    email: varchar("email", { length: 320 }).notNull(),
    role: companyUserRoleEnum("role").notNull().default("staff"),

    token: text("token").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    invitedByUserId: uuid("invited_by_user_id").notNull(),
    acceptedByUserId: uuid("accepted_by_user_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tokenUq: uniqueIndex("invites_token_uq").on(t.token),
    companyEmailStatusIdx: index("invites_company_email_status_idx").on(
      t.companyId,
      t.email,
      t.status,
    ),
    companyIdx: index("invites_company_idx").on(t.companyId),
    tenantIdx: index("invites_tenant_idx").on(t.tenantId),
    expiresIdx: index("invites_expires_idx").on(t.expiresAt),
  }),
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),

    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),

    role: text("role").notNull().default("admin"),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailUq: uniqueIndex("admin_users_email_uq").on(t.email),
    companyIdx: index("admin_users_company_idx").on(t.companyId),
  }),
);

/* ================================
   CLÍNICA / CADASTROS
================================ */

export const resourceTypes = pgTable(
  "resource_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(), // professional | room | chair | equipment
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex("resource_types_company_name_uq").on(t.companyId, t.name),
  }),
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    typeId: uuid("type_id")
      .notNull()
      .references(() => resourceTypes.id, { onDelete: "restrict" }),

    name: text("name").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    companyTypeIdx: index("resources_company_type_idx").on(
      t.companyId,
      t.typeId,
    ),
  }),
);

export const professionals = pgTable("professionals", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),

  name: text("name").notNull(),
  specialty: text("specialty"),
  photoUrl: text("photo_url"),

  status: text("status").default("active"),
  avgDurationMinutes: integer("avg_duration_minutes").default(20),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),

  resourceId: uuid("resource_id").references(() => resources.id, {
    onDelete: "set null",
  }),
});


export const professionalUnits = pgTable(
  "professional_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => companyUnits.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    companyProfessionalUnitUq: uniqueIndex("professional_units_company_professional_unit_uq").on(t.companyId, t.professionalId, t.unitId),
    professionalPrimaryUq: uniqueIndex("professional_units_company_professional_primary_uq").on(t.companyId, t.professionalId).where(sql`${t.isPrimary} = true`),
    companyUnitActiveIdx: index("professional_units_company_unit_active_idx").on(t.companyId, t.unitId, t.active),
    companyProfessionalActiveIdx: index("professional_units_company_professional_active_idx").on(t.companyId, t.professionalId, t.active),
  }),
).enableRLS();

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    name: text("name").notNull(),
    phoneE164: text("phone_e164").notNull(),

    birthDate: date("birth_date"),
    email: text("email"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      uniqueCompanyPhone: uniqueIndex("clients_company_phone_unique").on(
        table.companyId,
        table.phoneE164,
      ),
    };
  },
);

export const visitTypes = pgTable("visit_types", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),

  name: text("name").notNull(),
  description: text("description"),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id").references(() => companies.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  visitTypeId: uuid("visit_type_id").references(() => visitTypes.id),

  visitorName: text("visitor_name"),

  arrivedAt: timestamp("arrived_at", { withTimezone: true }).defaultNow(),
  status: text("status").default("checked_in"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   PAGAMENTOS
================================ */

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").references(() => tenants.id),

  amount: numeric("amount"),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),

  status: text("status").default("pending"),
  paymentMethod: text("payment_method"),
  currency: text("currency").default("BRL"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   AGENDAMENTOS LEGACY
================================ */

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id").references(() => companies.id),
    professionalId: uuid("professional_id").references(() => professionals.id),
    clientId: uuid("client_id").references(() => clients.id),

    scheduledTime: timestamp("scheduled_time", {
      withTimezone: true,
    }).notNull(),

    durationMinutes: integer("duration_minutes").notNull().default(30),

    endTime: timestamp("end_time", {
      withTimezone: true,
    }).notNull(),

    serviceNameSnapshot: text("service_name_snapshot"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    status: text("status").default("PENDING"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqueActiveSlot: uniqueIndex("appointments_unique_active_slot")
      .on(t.professionalId, t.scheduledTime)
      .where(sql`status in ('PENDING','CONFIRMED')`),
  }),
);

export const professionalSchedules = pgTable(
  "professional_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => companyUnits.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    periodUq: uniqueIndex("professional_schedules_company_unit_professional_period_uq").on(t.companyId, t.unitId, t.professionalId, t.weekday, t.startTime, t.endTime),
    professionalWeekdayIdx: index("professional_schedules_company_professional_weekday_idx").on(t.companyId, t.professionalId, t.weekday, t.startTime),
    unitWeekdayIdx: index("professional_schedules_company_unit_weekday_idx").on(t.companyId, t.unitId, t.weekday, t.startTime),
    weekdayCheck: check("professional_schedules_weekday_check", sql`${t.weekday} between 0 and 6`),
    timeFormatCheck: check("professional_schedules_time_format_check", sql`${t.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
    timeOrderCheck: check("professional_schedules_time_order_check", sql`${t.startTime} < ${t.endTime}`),
  }),
).enableRLS();

export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => companyUnits.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    reason: varchar("reason", { length: 240 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    createdBy: uuid("created_by"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    companyActivePeriodIdx: index("availability_exceptions_company_active_period_idx").on(t.companyId, t.startsAt, t.endsAt).where(sql`${t.status} = 'active'`),
    companyUnitActivePeriodIdx: index("availability_exceptions_company_unit_active_period_idx").on(t.companyId, t.unitId, t.startsAt, t.endsAt).where(sql`${t.status} = 'active' and ${t.unitId} is not null`),
    companyProfessionalActivePeriodIdx: index("availability_exceptions_company_professional_active_period_idx").on(t.companyId, t.professionalId, t.startsAt, t.endsAt).where(sql`${t.status} = 'active' and ${t.professionalId} is not null`),
    companyHistoryIdx: index("availability_exceptions_company_history_idx").on(t.companyId, t.status, t.createdAt),
    kindCheck: check("availability_exceptions_kind_check", sql`${t.kind} in ('holiday', 'closure', 'absence', 'block')`),
    periodCheck: check("availability_exceptions_period_check", sql`${t.endsAt} > ${t.startsAt}`),
    reasonCheck: check("availability_exceptions_reason_check", sql`length(trim(${t.reason})) between 2 and 240`),
    statusCheck: check("availability_exceptions_status_check", sql`${t.status} in ('active', 'revoked')`),
    targetCheck: check("availability_exceptions_target_check", sql`(${t.kind} in ('holiday', 'closure') and ${t.professionalId} is null) or (${t.kind} in ('absence', 'block') and ${t.professionalId} is not null)`),
    revocationCheck: check("availability_exceptions_revocation_check", sql`(${t.status} = 'active' and ${t.revokedAt} is null and ${t.revokedBy} is null) or (${t.status} = 'revoked' and ${t.revokedAt} is not null)`),
  }),
).enableRLS();

export const resourceSchedules = pgTable(
  "resource_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),

    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    resourceIdx: index("resource_schedules_resource_idx").on(
      t.resourceId,
      t.weekday,
    ),
  }),
);

export const schedulingConfig = pgTable(
  "scheduling_config",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("America/Sao_Paulo"),

    slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),
    bufferMinutes: integer("buffer_minutes").notNull().default(5),

    allowOverbooking: boolean("allow_overbooking").default(false),
    maxAdvanceDays: integer("max_advance_days").notNull().default(30),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    minCancelAdvanceMinutes: integer("min_cancel_advance_minutes")
      .notNull()
      .default(0),
    defaultUnitId: uuid("default_unit_id"),
    defaultServiceId: uuid("default_service_id"),
    defaultProfessionalId: uuid("default_professional_id"),
  },
  (t) => ({
    companyUnique: uniqueIndex("scheduling_config_company_unique").on(
      t.companyId,
    ),
  }),
);

/* ================================
   EMERGÊNCIA
================================ */

export const emergencyClasses = pgTable("emergency_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: text("name").notNull(),
  level: integer("level").notNull(),

  color: text("color"),
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const emergencyPolicies = pgTable("emergency_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  actionType: text("action_type").notNull(),
  maxDelayMinutes: integer("max_delay_minutes"),
  notifyChannels: text("notify_channels").array(),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const emergencyRules = pgTable("emergency_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(true),

  config: jsonb("config").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const emergencyEvents = pgTable("emergency_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id")
    .references(() => emergencyClasses.id)
    .notNull(),

  triggeredByClientId: uuid("triggered_by_client_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const emergencyLogs = pgTable("emergency_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull(),

  emergencyClassId: uuid("emergency_class_id").references(
    () => emergencyClasses.id,
  ),
  policyId: uuid("policy_id").references(() => emergencyPolicies.id),

  triggeredBy: text("triggered_by").notNull(),
  status: text("status").default("pending"),

  payload: jsonb("payload"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   OUTBOX
================================ */

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    dispatchIdx: index("outbox_dispatch_idx").on(
      t.status,
      t.nextRetryAt,
      t.createdAt,
    ),
    lockIdx: index("outbox_lock_idx").on(t.status, t.lockedAt),
    dedupeKeyUq: uniqueIndex("outbox_dedupe_key_uq")
      .on(t.dedupeKey)
      .where(sql`dedupe_key is not null`),
    eventTypeAllowed: check(
      "outbox_event_type_allowed",
      sql`${t.eventType} ~ '^[a-z0-9_]+(\\.[a-z0-9_]+)+$'`,
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
  status: text("status").notNull().default("active"),

  instanceId: text("instance_id").notNull(),
  token: text("token").notNull(),
  phoneNumber: text("phone_number"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
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

  toPhone: text("to_phone").notNull(),
  body: text("body").notNull(),

  response: jsonb("response"),
  status: text("status").default("pending").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   WHATSAPP
================================ */

export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  provider: varchar("provider", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  providerConfig: jsonb("provider_config").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ================================
   MESSAGE LOGS
================================ */

export const messageLogs = pgTable(
  "message_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    whatsappAccountId: uuid("whatsapp_account_id").references(
      () => whatsappAccounts.id,
      { onDelete: "set null" },
    ),

    outboxId: uuid("outbox_id").references(() => outbox.id, {
      onDelete: "set null",
    }),

    channel: varchar("channel", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    toPhone: varchar("to_phone", { length: 32 }).notNull(),

    messageType: varchar("message_type", { length: 32 })
      .notNull()
      .default("text"),

    body: text("body").notNull(),
    status: varchar("status", { length: 32 }).notNull(),

    providerMessageId: text("provider_message_id"),
    error: text("error"),

    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    outboxIdUq: uniqueIndex("message_logs_outbox_id_uq")
      .on(t.outboxId)
      .where(sql`outbox_id is not null`),

    companyStatusIdx: index("message_logs_company_status_idx").on(
      t.companyId,
      t.status,
      t.createdAt,
    ),

    providerMsgIdx: index("message_logs_provider_msg_idx").on(
      t.providerMessageId,
    ),
  }),
);

export const whatsappWebhookEvents = pgTable(
  "whatsapp_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),

    whatsappAccountId: uuid("whatsapp_account_id").references(
      () => whatsappAccounts.id,
      { onDelete: "set null" },
    ),

    provider: varchar("provider", { length: 32 }).notNull().default("meta"),
    eventType: text("event_type").notNull(),

    providerMessageId: text("provider_message_id"),

    payload: jsonb("payload").notNull(),
    headers: jsonb("headers"),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    receivedIdx: index("whatsapp_webhook_events_received_idx").on(t.receivedAt),
    providerMsgIdx: index("whatsapp_webhook_events_provider_msg_idx").on(
      t.providerMessageId,
    ),
    companyIdx: index("whatsapp_webhook_events_company_idx").on(
      t.companyId,
      t.receivedAt,
    ),
  }),
);

export const whatsappMessageStatusEvents = pgTable(
  "whatsapp_message_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    whatsappAccountId: uuid("whatsapp_account_id").references(
      () => whatsappAccounts.id,
      { onDelete: "set null" },
    ),

    messageLogId: uuid("message_log_id").references(() => messageLogs.id, {
      onDelete: "set null",
    }),

    provider: varchar("provider", { length: 32 }).notNull().default("meta"),
    providerMessageId: text("provider_message_id").notNull(),
    status: varchar("status", { length: 32 }).notNull(),

    timestampMs: integer("timestamp_ms"),

    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    rawPayload: jsonb("raw_payload"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    providerMsgIdx: index("whatsapp_status_provider_msg_idx").on(
      t.providerMessageId,
      t.createdAt,
    ),
    companyIdx: index("whatsapp_status_company_idx").on(
      t.companyId,
      t.createdAt,
    ),
    dedupeUq: uniqueIndex("whatsapp_status_dedupe_uq")
      .on(t.providerMessageId, t.status, t.timestampMs)
      .where(sql`timestamp_ms is not null`),
  }),
);

export const conversationSessions = pgTable(
  "conversation_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    status: varchar("status", { length: 16 }).notNull().default("open"),
    context: jsonb("context").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    openSessionUq: uniqueIndex("conversation_sessions_open_uq")
      .on(t.companyId, t.clientId)
      .where(sql`status = 'open'`),

    companyIdx: index("conversation_sessions_company_idx").on(
      t.companyId,
      t.updatedAt,
    ),
  }),
);

/* ================================
   SERVIÇOS / BOOKING
================================ */

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    price: numeric("price"),
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    companyActiveIdx: index("services_company_active_idx").on(
      t.companyId,
      t.active,
    ),
  }),
);


export const professionalServices = pgTable(
  "professional_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    durationOverrideMinutes: integer("duration_override_minutes"),
    priceOverride: numeric("price_override"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    companyProfessionalServiceUq: uniqueIndex("professional_services_company_professional_service_uq").on(t.companyId, t.professionalId, t.serviceId),
    companyProfessionalActiveIdx: index("professional_services_company_professional_active_idx").on(t.companyId, t.professionalId, t.active),
    companyServiceActiveIdx: index("professional_services_company_service_active_idx").on(t.companyId, t.serviceId, t.active),
    durationCheck: check("professional_services_duration_check", sql`${t.durationOverrideMinutes} is null or ${t.durationOverrideMinutes} between 5 and 1440`),
    priceCheck: check("professional_services_price_check", sql`${t.priceOverride} is null or ${t.priceOverride} >= 0`),
  }),
).enableRLS();

export const serviceBookingAssignmentRules = pgTable(
  "service_booking_assignment_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => companyUnits.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    priority: integer("priority").notNull().default(100),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    specificUq: uniqueIndex("service_booking_assignment_rules_specific_uq")
      .on(t.companyId, t.unitId, t.serviceId, t.weekday, t.startTime, t.endTime)
      .where(sql`${t.serviceId} is not null`),
    fallbackUq: uniqueIndex("service_booking_assignment_rules_fallback_uq")
      .on(t.companyId, t.unitId, t.weekday, t.startTime, t.endTime)
      .where(sql`${t.serviceId} is null`),
    resolutionIdx: index("service_booking_assignment_rules_resolution_idx")
      .on(t.companyId, t.unitId, t.weekday, t.active, t.priority, t.startTime, t.endTime),
    professionalIdx: index("service_booking_assignment_rules_professional_idx")
      .on(t.companyId, t.professionalId, t.active),
    weekdayCheck: check("service_booking_assignment_rules_weekday_check", sql`${t.weekday} between 0 and 6`),
    timeFormatCheck: check("service_booking_assignment_rules_time_format_check", sql`${t.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
    timeOrderCheck: check("service_booking_assignment_rules_time_order_check", sql`${t.startTime} < ${t.endTime}`),
    priorityCheck: check("service_booking_assignment_rules_priority_check", sql`${t.priority} between 1 and 1000`),
  }),
).enableRLS();

export const serviceRequirements = pgTable(
  "service_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),

    resourceTypeId: uuid("resource_type_id")
      .notNull()
      .references(() => resourceTypes.id, { onDelete: "restrict" }),

    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    serviceIdx: index("service_requirements_service_idx").on(t.serviceId),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => companyUnits.id, { onDelete: "restrict" }),

    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("PENDING"),

    notes: text("notes"),
    source: varchar("source", { length: 16 }).notNull().default("api"),
    requestedBy: uuid("requested_by"),
    requestId: varchar("request_id", { length: 100 }),

    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    noShowAt: timestamp("no_show_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    companyTimeIdx: index("bookings_company_time_idx").on(
      t.companyId,
      t.startTime,
    ),
    companyUnitTimeIdx: index("bookings_company_unit_time_idx").on(
      t.companyId,
      t.unitId,
      t.startTime,
    ),
    companyRequestIdx: index("bookings_company_request_idx").on(t.companyId, t.requestId),
    sourceCheck: check("bookings_source_check", sql`${t.source} in ('panel', 'whatsapp', 'agent', 'api')`),
  }),
);

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "restrict" }),

  durationMinutes: integer("duration_minutes").notNull(),
  price: numeric("price"),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bookingItemAllocations = pgTable(
  "booking_item_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingItemId: uuid("booking_item_id")
      .notNull()
      .references(() => bookingItems.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    blocksSchedule: boolean("blocks_schedule").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex("booking_item_allocations_uq").on(
      t.bookingItemId,
      t.resourceId,
    ),
    resourceIdx: index("booking_item_allocations_resource_idx").on(
      t.resourceId,
    ),
  }),
);

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    sessionId: uuid("session_id").references(() => conversationSessions.id, {
      onDelete: "set null",
    }),

    outboxId: uuid("outbox_id").references(() => outbox.id, {
      onDelete: "set null",
    }),

    type: bookingEventTypeEnum("type").notNull(),
    actor: bookingActorEnum("actor").notNull(),

    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    companyTimeIdx: index("booking_events_company_time_idx").on(
      t.companyId,
      t.createdAt,
    ),
    bookingIdx: index("booking_events_booking_idx").on(
      t.bookingId,
      t.createdAt,
    ),
  }),
);

export const bookingFeedbacks = pgTable(
  "booking_feedbacks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull(),
    clientId: uuid("client_id").notNull(),
    score: integer("score").notNull(),
    source: varchar("source", { length: 16 }).notNull().default("whatsapp"),
    correlationId: varchar("correlation_id", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({ companyBookingUq: uniqueIndex("booking_feedbacks_company_booking_uq").on(t.companyId, t.bookingId), companyCreatedIdx: index("booking_feedbacks_company_created_idx").on(t.companyId, t.createdAt) }),
).enableRLS();

export const bookingRecoveryCases = pgTable(
  "booking_recovery_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    feedbackId: uuid("feedback_id").notNull().references(() => bookingFeedbacks.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    priority: varchar("priority", { length: 16 }).notNull().default("high"),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    assignedTo: uuid("assigned_to"),
    resolutionNote: text("resolution_note"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    companyBookingUq: uniqueIndex("booking_recovery_cases_company_booking_uq").on(t.companyId, t.bookingId),
    companyStatusIdx: index("booking_recovery_cases_company_status_idx").on(t.companyId, t.status, t.openedAt),
    companyClientIdx: index("booking_recovery_cases_company_client_idx").on(t.companyId, t.clientId),
    scoreCheck: check("booking_recovery_cases_score_check", sql`${t.score} between 1 and 2`),
    statusCheck: check("booking_recovery_cases_status_check", sql`${t.status} in ('open', 'contacted', 'resolved', 'dismissed')`),
    priorityCheck: check("booking_recovery_cases_priority_check", sql`${t.priority} in ('high', 'urgent')`),
  }),
).enableRLS();

export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    enablePrecheckin: boolean("enable_precheckin").notNull().default(false),
    enableFollowup: boolean("enable_followup").notNull().default(false),
    enableReactivation: boolean("enable_reactivation").notNull().default(false),

    precheckinHoursBefore: integer("precheckin_hours_before")
      .notNull()
      .default(24),
    followupHoursAfter: integer("followup_hours_after").notNull().default(24),
    reactivationDaysAfter: integer("reactivation_days_after")
      .notNull()
      .default(60),

    templates: jsonb("templates").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uq: uniqueIndex("automation_rules_company_uq").on(t.companyId),
  }),
);

export const automationJobs = pgTable(
  "automation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    type: automationJobTypeEnum("type").notNull(),
    status: automationJobStatusEnum("status").notNull().default("pending"),

    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "cascade",
    }),

    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payload: jsonb("payload").notNull().default({}),
    outboxId: uuid("outbox_id").references(() => outbox.id, {
      onDelete: "set null",
    }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    lastError: text("last_error"),
    attempts: integer("attempts").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    runIdx: index("automation_jobs_run_idx").on(t.status, t.runAt),
    companyBookingIdx: index("automation_jobs_company_booking_idx").on(t.companyId, t.bookingId, t.status),
    dedupeUq: uniqueIndex("automation_jobs_dedupe_uq").on(t.dedupeKey),
  }),
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),

    status: text("status").notNull().default("processing"),
    responseJson: jsonb("response_json"),

    resourceId: uuid("resource_id").references(() => resources.id, {
      onDelete: "set null",
    }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uq: uniqueIndex("idempotency_keys_company_scope_key_uq").on(
      t.companyId,
      t.scope,
      t.key,
    ),
    expIdx: index("idempotency_keys_expires_idx").on(t.expiresAt),
    companyIdx: index("idempotency_keys_company_idx").on(
      t.companyId,
      t.updatedAt,
    ),
  }),
);
