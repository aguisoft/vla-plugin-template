import type { PluginDefinition } from '@vla/plugin-sdk';

/**
 * Punto de entrada del plugin.
 * Este objeto se exporta como default y es cargado por VLA al iniciar.
 *
 * `ctx` contiene todo lo que el plugin necesita: rutas, hooks, DB, Redis, etc.
 * Lee la documentación en README.md para una referencia completa.
 */
const plugin: PluginDefinition = {
  // ─── Registro ─────────────────────────────────────────────────────────────
  // Se llama una vez al arrancar el servidor.
  // Aquí registras rutas, hooks, crons y cualquier inicialización.
  async register(ctx) {
    ctx.logger.log('Plugin iniciado');

    // ── Rutas HTTP ───────────────────────────────────────────────────────────
    // Todas las rutas se montan en: /api/v1/p/<name>/
    // Ejemplo: ctx.router.get('/hello')  →  GET /api/v1/p/my-plugin/hello

    // Ruta pública (requiere JWT pero sin restricción de rol)
    ctx.router.get('/hello', ctx.requireAuth(), (_req, res) => {
      res.json({ ok: true, message: 'Hola desde my-plugin' });
    });

    // Ruta protegida: solo ADMIN
    ctx.router.get('/admin-only', ctx.requireAuth('ADMIN'), async (_req, res) => {
      const users = await ctx.prisma.user.findMany({
        take: 10,
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      res.json(users);
    });

    // Ruta con body (POST)
    ctx.router.post('/items', ctx.requireAuth(), async (req, res) => {
      const { name } = req.body as { name: string };
      if (!name) {
        return res.status(400).json({ message: 'name is required' });
      }

      // Guardar algo en Redis (namespace automático: plugin:my-plugin:*)
      await ctx.redis.setJson('lastItem', { name, createdAt: new Date() }, 300);

      // Emitir un hook para que otros plugins puedan reaccionar
      await ctx.hooks.doAction('my-plugin.item.created', { name, userId: (req as any).user?.sub });

      res.status(201).json({ ok: true, name });
    });

    // ── Listeners de hooks ───────────────────────────────────────────────────
    // Reaccionar cuando alguien entra a la oficina
    ctx.hooks.registerAction(
      'office.user.checked_in',
      async (payload: { userId: string }) => {
        ctx.logger.log(`Usuario ${payload.userId} entró a la oficina`);
        // Aquí puedes ejecutar cualquier lógica de negocio
      },
    );

    // ── Cron jobs ────────────────────────────────────────────────────────────
    // Formato estándar cron: minuto hora díaMes mes díaSemana
    // Este ejemplo corre de lunes a viernes a las 9:00 AM (UTC)
    ctx.cron('0 9 * * 1-5', async () => {
      ctx.logger.log('Tarea programada ejecutada');
      // await enviarReporte();
    });
  },

  // ─── Desactivación ────────────────────────────────────────────────────────
  // Opcional. Se llama al desactivar el plugin desde el panel admin.
  // Libera recursos, cancela procesos externos, etc.
  async onDeactivate() {
    // cleanup
  },

  // ─── Primera instalación ──────────────────────────────────────────────────
  // Opcional. Se llama una sola vez cuando el plugin se instala por primera vez.
  async onInstall() {
    // seed inicial, migraciones propias, etc.
  },
};

export default plugin;
