import { useEffect, useState } from 'react';
import { User } from '../types';
import { clearCurrentUser, getCurrentUser } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const logout = () => {
    clearCurrentUser();
    setUser(null);
  };

  return {
    user,
    isAdmin: user?.role === 'admin',
    logout,
  };
}
