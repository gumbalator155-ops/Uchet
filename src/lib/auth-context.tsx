import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider, isFirebaseDummy } from './firebase.ts';

interface DbUser {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  role: 'Администратор' | 'Сотрудник';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
  isFirebaseDummy: boolean;
  signInAsDevUser: (role: 'Администратор' | 'Сотрудник') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      } else {
        console.error('Не удалось загрузить профиль пользователя из БД');
        setDbUser(null);
      }
    } catch (error) {
      console.error('Ошибка получения профиля из БД:', error);
      setDbUser(null);
    }
  };

  const refreshDbUser = async () => {
    if (token) {
      await fetchDbUser(token);
    }
  };

  useEffect(() => {
    if (isFirebaseDummy) {
      const storedUser = localStorage.getItem('dev_auth_user');
      const storedToken = localStorage.getItem('dev_auth_token');
      if (storedUser && storedToken) {
        const u = JSON.parse(storedUser);
        setUser(u);
        setToken(storedToken);
        fetchDbUser(storedToken).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          await fetchDbUser(idToken);
        } catch (error) {
          console.error('Ошибка получения ID токена:', error);
          setToken(null);
          setDbUser(null);
        }
      } else {
        setUser(null);
        setDbUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isFirebaseDummy) {
      throw new Error('Firebase configuration is missing or invalid. Use development bypass login.');
    }
    if (!auth) {
      throw new Error('Firebase auth not initialized.');
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Ошибка авторизации через Google:', error);
      setLoading(false);
      throw error;
    }
  };

  const signInAsDevUser = async (role: 'Администратор' | 'Сотрудник') => {
    setLoading(true);
    const mockUser = {
      uid: role === 'Администратор' ? 'dev-admin-uid' : 'dev-employee-uid',
      email: role === 'Администратор' ? 'admin@kanctrade.ru' : 'employee@kanctrade.ru',
      displayName: role === 'Администратор' ? 'Администратор (Локальный)' : 'Сотрудник (Локальный)',
    } as any;
    
    const mockToken = role === 'Администратор' ? 'dev-admin-token' : 'dev-employee-token';
    
    localStorage.setItem('dev_auth_user', JSON.stringify(mockUser));
    localStorage.setItem('dev_auth_token', mockToken);
    
    setUser(mockUser);
    setToken(mockToken);
    await fetchDbUser(mockToken);
    setLoading(false);
  };

  const signOutUser = async () => {
    setLoading(true);
    if (isFirebaseDummy) {
      localStorage.removeItem('dev_auth_user');
      localStorage.removeItem('dev_auth_token');
      setUser(null);
      setDbUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, token, loading, signInWithGoogle, signOutUser, refreshDbUser, isFirebaseDummy, signInAsDevUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
