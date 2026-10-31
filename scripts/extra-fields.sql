-- Custom Fields (Extra Fields) subsystem — idempotent DDL
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "key" varchar(50) NOT NULL,
  "label" varchar(120) NOT NULL,
  "type" varchar(20) NOT NULL DEFAULT 'text',
  "options" text,
  "required" boolean NOT NULL DEFAULT false,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_field_defs_tenant_entity_key
  ON custom_field_defs ("tenantId", "entity_type", "key");

CREATE TABLE IF NOT EXISTS custom_field_values (
  id serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" integer NOT NULL,
  "field_key" varchar(50) NOT NULL,
  "value" text
);
CREATE INDEX IF NOT EXISTS custom_field_values_tenant_entity
  ON custom_field_values ("tenantId", "entity_type", "entity_id");
