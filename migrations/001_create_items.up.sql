-- Plugin: my-plugin | Migration 001
-- Se ejecuta automáticamente al instalar/actualizar el plugin.
-- Las tablas se crean dentro del schema "plugin_my_plugin" (aislado del core).
-- Usa ctx.query() en tu código para consultar estas tablas.

CREATE TABLE IF NOT EXISTS items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at DESC);
