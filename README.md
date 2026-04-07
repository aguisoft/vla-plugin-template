# VLA Plugin Template

Repositorio base para desarrollar plugins para **VLA System**.

## Requisitos

- Node.js 18+
- `zip` instalado en el sistema (Linux / Mac: incluido por defecto; Windows: usar Git Bash o WSL)

---

## Inicio rápido

```bash
# 1. Clonar este template (junto al core, en la misma carpeta padre)
git clone https://github.com/aguisoft/vla-plugin-template.git my-plugin
cd my-plugin
npm install

# 2. Editar el manifiesto
#    → cambia name, version, description, route, permissions
nano plugin.json   # o abre en tu editor

# 3. Desarrollar con el core local
#    Terminal A — core corriendo:
#      cd ../vla-system && npm run dev -w @vla/api
#
#    Terminal B — compilar + instalar en el core:
npm run dev          # compila y copia al core → luego reinicia el core
npm run build:watch  # solo watch, sin instalar (útil mientras editas)

# 4. Publicar en producción
npm run release      # genera my-plugin-1.0.0.vla.zip
# subir desde Admin → Módulos
```

---

## Estructura del proyecto

```
my-vla-plugin/
├── plugin.json          ← Manifiesto (identidad, permisos, hooks)
├── src/
│   └── index.ts         ← Punto de entrada del plugin
├── dist/                ← Generado por tsc (NO editar manualmente)
├── scripts/
│   └── pack.js          ← Script de empaquetado
├── vendor/
│   └── plugin-sdk/      ← Tipos del SDK (no subir cambios aquí)
├── package.json
└── tsconfig.json
```

---

## Configurar `plugin.json`

| Campo | Requerido | Descripción |
|---|---|---|
| `name` | ✓ | Identificador único en kebab-case. Ej: `"attendance-report"` |
| `version` | ✓ | Versión semántica. Ej: `"1.0.0"` |
| `description` | ✓ | Descripción corta visible en el panel admin |
| `author` | ✓ | Nombre del autor o equipo |
| `vlaMinVersion` | ✓ | Versión mínima del core requerida. Usar `"1.0.0"` |
| `permissions` | ✓ | Array de permisos. Ver tabla abajo |
| `route` | — | Ruta frontend. Ej: `"/dashboard/vacaciones"` |
| `icon` | — | Nombre del ícono Lucide. Ej: `"calendar"`, `"users"` |
| `adminOnly` | — | `true` = solo admins pueden ver este plugin |

### Permisos disponibles

Declara **solo los que necesitas** — el sistema no expondrá lo que no declares.

| Permiso | Acceso |
|---|---|
| `read:users` | `ctx.prisma.user.findMany/findUnique` |
| `write:users` | `ctx.prisma.user.create/update/delete` |
| `read:presence` | `ctx.prisma.presenceStatus.findMany` |
| `write:presence` | `ctx.prisma.presenceStatus.update` |
| `read:checkins` | `ctx.prisma.checkInRecord.findMany` |
| `write:checkins` | `ctx.prisma.checkInRecord.create` |

---

## API del plugin (`ctx`)

Dentro de `register(ctx)` tienes acceso a:

### `ctx.router` — Rutas HTTP

```typescript
// Todas las rutas se montan en /api/v1/p/<name>/
ctx.router.get('/reporte', ctx.requireAuth(), async (req, res) => {
  res.json({ ok: true });
});

ctx.router.post('/crear', ctx.requireAuth('ADMIN'), async (req, res) => {
  const data = req.body;
  // ...
  res.status(201).json(data);
});
```

### `ctx.requireAuth(role?)` — Middleware de autenticación

```typescript
ctx.requireAuth()           // cualquier usuario con JWT válido
ctx.requireAuth('ADMIN')    // solo administradores
ctx.requireAuth('STAFF')    // solo staff
ctx.requireAuth('PROFESSOR') // solo profesores
```

El usuario autenticado queda en `(req as any).user` con la forma `{ sub: string, role: string }`.

### `ctx.prisma` — Base de datos

```typescript
// Solo los modelos declarados en permissions estarán disponibles
const users = await ctx.prisma.user.findMany({ take: 20 });
const record = await ctx.prisma.checkInRecord.create({ data: { ... } });
```

### `ctx.redis` — Cache (namespace automático)

```typescript
// Las claves se almacenan como plugin:<name>:<key>
await ctx.redis.set('clave', 'valor', 300);          // TTL 300s
await ctx.redis.get('clave');                         // string | null
await ctx.redis.setJson('objeto', { a: 1 }, 600);    // serializa a JSON
await ctx.redis.getJson<MiTipo>('objeto');            // deserializa
await ctx.redis.del('clave');
```

### `ctx.hooks` — Sistema de hooks

```typescript
// Escuchar un evento de otro plugin
ctx.hooks.registerAction('office.user.checked_in', async ({ userId }) => {
  await notificar(userId);
});

// Emitir un evento
await ctx.hooks.doAction('mi-plugin.algo.ocurrio', { datos: '...' });

// Filtros (transformar datos en cadena)
ctx.hooks.registerFilter('core.user.serialize', async (user) => ({
  ...user,
  displayName: `${user.firstName} ${user.lastName}`,
}));
```

### Hooks del core disponibles

| Hook | Tipo | Payload |
|---|---|---|
| `core.user.created` | Action | `{ user }` |
| `core.user.updated` | Action | `{ userId, changes }` |
| `core.user.serialize` | Filter | objeto `user` |
| `core.auth.login` | Action | `{ user, token }` |
| `core.plugin.activated` | Action | `{ pluginName }` |
| `core.plugin.deactivated` | Action | `{ pluginName }` |

### Hooks del plugin Office disponibles

| Hook | Tipo | Payload |
|---|---|---|
| `office.user.checked_in` | Action | `{ userId, user, source }` |
| `office.user.checked_out` | Action | `{ userId }` |
| `office.user.status_changed` | Action | `{ userId, status }` |
| `office.user.moved` | Action | `{ userId, zoneId, positionX, positionY }` |

### `ctx.cron(expression, handler)` — Tareas programadas

```typescript
// Lunes a viernes a las 9:00 AM UTC
ctx.cron('0 9 * * 1-5', async () => {
  ctx.logger.log('Ejecutando reporte diario...');
});

// Cada hora
ctx.cron('0 * * * *', async () => { /* ... */ });
```

### `ctx.logger` — Logs

```typescript
ctx.logger.log('Mensaje informativo');
ctx.logger.warn('Advertencia');
ctx.logger.error('Error grave');
ctx.logger.debug('Debug (solo en modo desarrollo)');
// Aparece en los logs del servidor como: [mi-plugin] Mensaje informativo
```

### `ctx.plugin` — Metadata

```typescript
ctx.plugin.name     // "mi-plugin"
ctx.plugin.version  // "1.0.0"
ctx.plugin.config   // configuración almacenada en BD por el admin
```

---

## Ciclo de vida

| Método | Cuándo se llama |
|---|---|
| `register(ctx)` | En cada arranque del servidor |
| `onInstall()` | Solo la primera vez que se instala |
| `onDeactivate()` | Al desactivar desde el panel admin |

---

## Flujo de desarrollo

```
editar src/index.ts
       │
       ▼
npm run build        # compila TypeScript → dist/
       │
       ▼
npm run pack         # crea my-plugin-1.0.0.vla.zip
       │
       ▼
Admin → Módulos → Subir .vla.zip
       │
       ▼
servidor reinicia y carga el plugin
       │
       ▼
probar en http://localhost:3001/api/v1/p/my-plugin/
```

Para iterar rápido en **desarrollo local** (con acceso al servidor):
1. Copia manualmente el zip a `storage/plugins/` y extrae allí
2. Reinicia el servidor con `npm run dev -w @vla/api`

---

## Subir una nueva versión

1. Incrementa `version` en `plugin.json` y en `package.json`
2. `npm run release`
3. Sube el nuevo zip desde el panel admin
4. El servidor reinicia y carga la versión actualizada

---

## Preguntas frecuentes

**¿Puedo usar librerías npm en mi plugin?**
Sí. Instálalas con `npm install` y asegúrate de compilarlas en el bundle. Para plugins simples, usa `tsc` directamente (las deps de `node_modules` se incluirán al hacer `require`). Si tu plugin tiene muchas deps, considera usar `esbuild` o `webpack` para generar un bundle single-file.

**¿Puede mi plugin añadir páginas al frontend?**
Por ahora la página frontend se añade manualmente en el repo principal de VLA (`apps/web/src/app/dashboard/<ruta>/`). El plugin registra su `route` en el manifiesto para que aparezca en la navegación.

**¿Puede mi plugin añadir modelos a la base de datos?**
No directamente. Los modelos DB son gestionados por el core con Prisma. Si necesitas persistencia propia, usa Redis (`ctx.redis`) o pide al equipo de VLA añadir un modelo al schema.
