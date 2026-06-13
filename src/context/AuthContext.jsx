import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/authService';

const AuthContext = createContext(null);

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#1E1B4B' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-300 border-t-white animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold">Voxofied AI</p>
        <p className="text-sm mt-1" style={{ color: 'rgba(196,181,253,0.7)' }}>Loading…</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
