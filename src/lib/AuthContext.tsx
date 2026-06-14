import React, { createContext, useContext, useState, useEffect } from 'react';

export type User = {
  id: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('flowshare_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (username: string) => {
    // Generate a simple unique ID for mock auth
    const id = `user_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = { id, username };
    setUser(newUser);
    localStorage.setItem('flowshare_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('flowshare_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
