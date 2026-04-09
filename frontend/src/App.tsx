import { usePluginAuth, PluginShell, PluginLoading } from './vla';

export default function App() {
  const { user, loading } = usePluginAuth();

  if (loading || !user) return <PluginLoading />;

  return (
    <PluginShell
      title="My Plugin"
      subtitle="Plugin de ejemplo"
      user={user}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Plugin listo!</p>
          <p className="text-sm text-gray-400 mt-1">
            Edita <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">frontend/src/App.tsx</code> para empezar.
          </p>
        </div>
      </div>
    </PluginShell>
  );
}
