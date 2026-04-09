# VLA Plugin Template

Repositorio base para desarrollar plugins para **VLA System**.

## Quick Start

```bash
# 1. Clonar y renombrar
git clone <template-url> vla-plugin-mi-plugin
cd vla-plugin-mi-plugin

# 2. Instalar dependencias
npm install
cd frontend && npm install && cd ..

# 3. Editar plugin.json (nombre, descripción, permisos)
# 4. Editar src/index.ts (rutas, hooks, lógica)
# 5. Editar frontend/src/App.tsx (interfaz)

# 6. Compilar y empaquetar
npm run release

# 7. Subir en Admin → Modulos → Seleccionar .vla.zip
```

> **Tip**: Usa el CLI `npx create-vla-plugin mi-plugin` para generar un proyecto con prompts interactivos.

---

## Estructura del proyecto

```
my-plugin/
  plugin.json              ← Manifiesto: nombre, permisos, settings, requires
  src/index.ts             ← Backend: rutas, hooks, crons, lógica
  frontend/
    src/App.tsx            ← Frontend: React + Tailwind + PluginShell
    src/vla/               ← UI Kit compartido (no editar)
  migrations/
    001_create_items.up.sql   ← SQL ejecutado al instalar
    001_create_items.down.sql ← SQL ejecutado al desinstalar
  vendor/plugin-sdk/       ← Tipos del SDK (no editar)
  scripts/pack.js          ← Empaquetador .vla.zip
```

---

## plugin.json — Manifiesto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Identificador en kebab-case. Ej: `"my-plugin"` |
| `version` | string | Semver. Ej: `"1.0.0"` |
| `description` | string | Descripción corta (visible en Admin) |
| `author` | string | Autor o equipo |
| `vlaMinVersion` | string | Versión mínima del core requerida |
| `route` | string? | Ruta frontend. Ej: `"/dashboard/my-plugin"` |
| `icon` | string? | Icono Lucide. Ej: `"star"`, `"chart-bar"` |
| `adminOnly` | boolean | Solo visible para admins |
| `accessPermissions` | string[] | Permisos requeridos para ver el plugin en el sidebar |
| `requires` | string[] | Integraciones del core requeridas. Valores: `["bitrix"]` |
| `permissions` | string[] | Permisos de acceso a datos del core |
| `settings` | object | Schema declarativo de configuración (ver abajo) |
| `hooks` | object | Hooks que escucha y emite (documentación) |

### Settings (Configuración declarativa)

Define campos en `settings` y el core genera automáticamente un formulario en Admin → Modulos → (gear):

```json
"settings": {
  "sections": [{
    "title": "API Externa",
    "fields": [
      { "key": "apiUrl",  "type": "url",     "label": "URL",    "required": true },
      { "key": "apiKey",  "type": "secret",  "label": "API Key" },
      { "key": "limit",   "type": "number",  "label": "Limite", "min": 1, "max": 100 },
      { "key": "active",  "type": "boolean", "label": "Activo" },
      { "key": "mode",    "type": "select",  "label": "Modo",   "options": [
        { "value": "dev", "label": "Desarrollo" },
        { "value": "prod", "label": "Produccion" }
      ]}
    ]
  }]
}
```

Tipos disponibles: `string`, `url`, `secret`, `text`, `number`, `boolean`, `select`.

Los valores se leen en el plugin con `ctx.plugin.config.apiKey`.

---

## ctx — API del Plugin

El objeto `ctx` que recibe `register()` contiene todo lo que necesitas:

### Rutas HTTP

```typescript
// Se montan en /api/v1/p/<plugin-name>/
ctx.router.get('/data', ctx.requireAuth(), ctx.requirePermission('my.perm'), (req, res) => {
  res.json({ ok: true });
});
```

### Base de datos (Prisma)

```typescript
const users = await ctx.prisma.user.findMany({ take: 10 });
```

### Base de datos propia (SQL)

Cada plugin tiene un schema PostgreSQL aislado (`plugin_<name>`).
Coloca SQL en `migrations/` y usa `ctx.query()`:

```typescript
const items = await ctx.query<{ id: string; name: string }>('SELECT * FROM items');
await ctx.query('INSERT INTO items (name) VALUES ($1)', ['ejemplo']);
```

### Redis

```typescript
await ctx.redis.set('key', 'value', 300);        // TTL 300s
await ctx.redis.setJson('obj', { foo: 1 }, 600);
const val = await ctx.redis.get('key');
const obj = await ctx.redis.getJson<{ foo: number }>('obj');
```

### Hooks

```typescript
// Escuchar un hook
ctx.hooks.registerAction('office.user.checked_in', async ({ userId }) => {
  ctx.logger.log(`User ${userId} checked in`);
});

// Emitir un hook
await ctx.hooks.doAction('my-plugin.item.created', { name: 'test' });

// Declarar un hook con documentacion (aparece en Admin → Hooks)
ctx.hooks.declareHook('my-plugin.item.created', {
  description: 'Se creo un item',
  payload: { name: 'string', userId: 'string' },
});

// Filtro: transformar datos
ctx.hooks.registerFilter('core.permissions.register', (map) => ({
  ...map,
  'my.perm': { label: 'Mi permiso', group: 'Mi Plugin', plugin: ctx.plugin.name },
}));
```

### Hooks disponibles del core

| Hook | Tipo | Payload |
|------|------|---------|
| `core.user.created` | action | `{ user }` |
| `core.user.updated` | action | `{ userId, changes }` |
| `core.auth.login` | action | `{ user, token }` |
| `core.plugin.activated` | action | `{ pluginName }` |
| `core.plugin.deactivated` | action | `{ pluginName }` |
| `core.permissions.register` | filter | `Record<string, { label, group, plugin? }>` |
| `core.roles.preset` | filter | `Array<{ name, permissions[], color?, plugin }>` |
| `office.user.checked_in` | action | `{ userId, source }` |
| `office.user.checked_out` | action | `{ userId }` |
| `office.user.status_changed` | action | `{ userId, status }` |

### Cron

```typescript
ctx.cron('*/5 * * * *', async () => {
  ctx.logger.log('Cada 5 minutos');
});
```

### Bitrix24

Requiere `"requires": ["bitrix"]` en plugin.json:

```typescript
const users = await ctx.bitrix!.callAll('user.get', { FILTER: { ACTIVE: true } });
const lead = await ctx.bitrix!.call('crm.lead.get', { id: 123 });
const raw = await ctx.bitrix!.callRaw('crm.deal.list', { filter: {} }); // { result, next, total }
```

### Logger

```typescript
ctx.logger.log('Info');
ctx.logger.warn('Advertencia');
ctx.logger.error('Error');
```

### Config

```typescript
const apiKey = ctx.plugin.config.apiKey as string;
```

---

## Migrations — Base de datos propia

Coloca archivos SQL en `migrations/`:

```
migrations/
  001_create_items.up.sql     ← CREATE TABLE ...
  001_create_items.down.sql   ← DROP TABLE ...
  002_add_index.up.sql
  002_add_index.down.sql
```

- Se ejecutan **automaticamente** al instalar/actualizar el plugin
- Cada plugin tiene su propio schema PostgreSQL (`plugin_<name>`)
- El `search_path` se configura automaticamente
- Se hace rollback al desinstalar

---

## Frontend — PluginShell

Todos los plugins usan `PluginShell` del kit compartido (`frontend/src/vla/`):

```tsx
import { usePluginAuth, PluginShell, PluginLoading } from './vla';

export default function App() {
  const { user, loading, isAdmin } = usePluginAuth();
  if (loading || !user) return <PluginLoading />;

  return (
    <PluginShell
      title="Mi Plugin"
      subtitle="Descripcion"
      headerActions={<button>Accion</button>}
      user={user}
    >
      <div className="p-6">Contenido aqui</div>
    </PluginShell>
  );
}
```

Props de PluginShell:

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `title` | string | Titulo en el header |
| `subtitle` | string? | Subtitulo |
| `headerCenter` | ReactNode? | Contenido central (tabs, filtros) |
| `headerActions` | ReactNode? | Botones/controles a la derecha |
| `user` | PluginUser | Usuario autenticado |

---

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run build` | Compila backend (tsc) |
| `npm run build:frontend` | Compila frontend (vite) |
| `npm run pack` | Empaqueta .vla.zip |
| `npm run release` | build + build:frontend + pack |
| `npm run dev` | Build + instala en servidor local |

---

## Lifecycle

| Metodo | Cuando se llama |
|--------|-----------------|
| `register(ctx)` | Al iniciar el servidor (siempre) |
| `onInstall()` | Primera vez que se instala |
| `onActivate()` | Cada vez que se activa desde Admin |
| `onDeactivate()` | Cada vez que se desactiva desde Admin |

---

## FAQ

**Como agrego dependencias npm?**
`npm install mi-paquete` en la raiz del plugin. Se incluyen en `dist/` via bundling.

**Como accedo a la BD del core?**
Usa `ctx.prisma` (Prisma Client). Ejemplo: `ctx.prisma.user.findMany()`.

**Como creo tablas propias?**
Agrega SQL en `migrations/` y usa `ctx.query()` para consultar.

**Como integro con Bitrix24?**
Agrega `"bitrix"` al array `requires` de plugin.json y usa `ctx.bitrix!`.

**Como configuro el plugin sin codigo?**
Define `settings` en plugin.json con campos declarativos. El formulario se genera automaticamente.
