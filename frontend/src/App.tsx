import { useEffect, useState } from 'react';
import { api } from './api';

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    api.get<CurrentUser>('/auth/me').then(setUser).catch(() => {
      window.location.href = '/login';
    });
  }, []);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100">
        <h1 className="text-sm font-bold text-gray-800">My Plugin</h1>
        <span className="ml-auto text-xs text-gray-400">
          {user.firstName} {user.lastName}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">¡Plugin listo!</p>
          <p className="text-sm text-gray-400 mt-1">
            Edita <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">frontend/src/App.tsx</code> para empezar.
          </p>
        </div>
      </div>
    </div>
  );
}
