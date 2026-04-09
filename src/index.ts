import type { PluginDefinition } from '@vla/plugin-sdk';

// ─── Capabilities del plugin ──────────────────────────────────────────────────
// Define aquí todos los permisos que este plugin introduce.
// Convención: "<plugin-name>.<accion>" en minúsculas y puntos.
// Aparecerán en Admin → Roles → editor de permisos.
//
// REGLA: Cada plugin DEBE registrar capabilities y proteger rutas con
// ctx.requirePermission(). Nunca dejes rutas abiertas solo con ctx.requireAuth().
const PERMS = {
  READ:  'my-plugin.read',
  WRITE: 'my-plugin.write',
} as const;

const plugin: PluginDefinition = {
  async register(ctx) {
    ctx.logger.log('Plugin iniciado');

    // ── 1. Capabilities — registrar permisos en el mapa global ─────────────
    ctx.hooks.registerFilter('core.permissions.register', (map: any) => ({
      ...map,
      [PERMS.READ]:  { label: 'Ver My Plugin',    group: 'My Plugin', plugin: ctx.plugin.name },
      [PERMS.WRITE]: { label: 'Editar My Plugin', group: 'My Plugin', plugin: ctx.plugin.name },
    }));

    // ── 2. Role presets — sugerir roles predefinidos en Admin → Roles ───────
    ctx.hooks.registerFilter('core.roles.preset', (roles: any[]) => [
      ...roles,
      {
        name: 'Usuario My Plugin',
        description: 'Puede ver y editar My Plugin',
        permissions: [PERMS.READ, PERMS.WRITE],
        color: '#6B7280',
        plugin: ctx.plugin.name,
      },
    ]);

    // ── 3. Rutas HTTP ──────────────────────────────────────────────────────
    // Se montan en: /api/v1/p/<name>/
    // Patrón: requireAuth() + requirePermission() siempre en ese orden.

    ctx.router.get('/hello', ctx.requireAuth(), ctx.requirePermission(PERMS.READ), (_req: any, res: any) => {
      res.json({ ok: true, message: 'Hola desde my-plugin', config: ctx.plugin.config });
    });

    ctx.router.post('/items', ctx.requireAuth(), ctx.requirePermission(PERMS.WRITE), async (req: any, res: any) => {
      const { name } = req.body as { name: string };
      if (!name) return res.status(400).json({ message: 'name es requerido' });

      // Redis (namespace automático: plugin:my-plugin:*)
      await ctx.redis.setJson('lastItem', { name, at: new Date() }, 300);

      // Emitir hook para que otros plugins reaccionen
      await ctx.hooks.doAction('my-plugin.item.created', { name, userId: req.user?.sub });

      res.status(201).json({ ok: true, name });
    });

    // ── 4. Declarar hooks con documentación ────────────────────────────────
    // declareHook registra el hook en el catálogo (Admin → Hooks) con
    // descripción y schema del payload para que otros devs sepan qué emite.
    ctx.hooks.declareHook('my-plugin.item.created', {
      description: 'Se creó un item en My Plugin',
      payload: { name: 'string', userId: 'string' },
    });

    // ── 5. Escuchar hooks de otros plugins ─────────────────────────────────
    ctx.hooks.registerAction(
      'office.user.checked_in',
      async (payload: { userId: string; source: string }) => {
        ctx.logger.log(`Usuario ${payload.userId} entró a la oficina (${payload.source})`);
      },
    );

    // ── 6. Bitrix24 (requiere "requires": ["bitrix"] en plugin.json) ───────
    // Si tu plugin necesita Bitrix, agrega "bitrix" al array requires.
    // Esto garantiza que ctx.bitrix estará disponible cuando register() se ejecute.
    // Si Bitrix no está configurado, el plugin NO se cargará (modo degradado).
    //
    // Métodos:
    //   ctx.bitrix!.call('user.current')                    → resultado directo
    //   ctx.bitrix!.callRaw('crm.lead.list', { filter })    → { result, next, total }
    //   ctx.bitrix!.callAll('user.get', { FILTER: {} })     → array auto-paginado
    //   ctx.bitrix!.isConfigured()                          → boolean

    // ── 7. Base de datos propia (requiere migrations/) ─────────────────────
    // Cada plugin tiene su schema PostgreSQL aislado: plugin_<name>
    // Coloca SQL en migrations/:
    //   migrations/001_create_tables.up.sql   → se ejecuta al instalar
    //   migrations/001_create_tables.down.sql → se ejecuta al desinstalar
    //
    // Luego usa ctx.query() para consultar tus tablas:
    //   const items = await ctx.query<{ id: string; name: string }>('SELECT * FROM items');
    //   await ctx.query('INSERT INTO items (name) VALUES ($1)', ['ejemplo']);

    // ── 8. Configuración declarativa ───────────────────────────────────────
    // El campo "settings" en plugin.json genera automáticamente un formulario
    // en Admin → Módulos → (gear). Los valores se guardan en ctx.plugin.config.
    //
    // Acceder a la config:
    //   const apiKey = ctx.plugin.config.apiKey as string;
    //   const maxResults = ctx.plugin.config.maxResults as number ?? 50;

    // ── 9. Cron jobs ───────────────────────────────────────────────────────
    // Formato cron: minuto hora díaMes mes díaSemana
    ctx.cron('0 9 * * 1-5', async () => {
      ctx.logger.log('Tarea programada ejecutada');
    });
  },

  // Se llama cada vez que el plugin es activado desde Admin
  async onActivate() {},

  // Se llama al desactivar el plugin
  async onDeactivate() {},

  // Se llama una sola vez cuando se instala por primera vez
  async onInstall() {},
};

export default plugin;
