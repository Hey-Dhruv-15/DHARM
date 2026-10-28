import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { DEMO_CREDENTIALS } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  quickFill: (role: UserRole) => { email: string; pass: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dharm_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to Owner if needed or null for login page
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('dharm_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dharm_auth_user');
    }
  }, [user]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    // Artificial small delay for realistic UX
    await new Promise(r => setTimeout(r, 450));

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (cleanPass.toLowerCase() !== 'dharam@123') {
      return { success: false, error: 'Invalid password. Hint: default demo password is Dharam@123' };
    }

    if (normalizedEmail === DEMO_CREDENTIALS.OWNER.email.toLowerCase()) {
      const u: User = {
        id: 'usr-owner-01',
        name: DEMO_CREDENTIALS.OWNER.name,
        email: DEMO_CREDENTIALS.OWNER.email,
        role: 'OWNER',
        organization: DEMO_CREDENTIALS.OWNER.organization,
        location: DEMO_CREDENTIALS.OWNER.location,
        avatar: '👑'
      };
      setUser(u);
      return { success: true, user: u };
    }

    if (normalizedEmail === DEMO_CREDENTIALS.VENDOR.email.toLowerCase()) {
      const u: User = {
        id: 'usr-vendor-02',
        name: DEMO_CREDENTIALS.VENDOR.name,
        email: DEMO_CREDENTIALS.VENDOR.email,
        role: 'VENDOR',
        organization: DEMO_CREDENTIALS.VENDOR.organization,
        location: DEMO_CREDENTIALS.VENDOR.location,
        avatar: '🏢'
      };
      setUser(u);
      return { success: true, user: u };
    }

    if (normalizedEmail === DEMO_CREDENTIALS.CUSTOMER.email.toLowerCase()) {
      const u: User = {
        id: 'usr-cust-03',
        name: DEMO_CREDENTIALS.CUSTOMER.name,
        email: DEMO_CREDENTIALS.CUSTOMER.email,
        role: 'CUSTOMER',
        organization: DEMO_CREDENTIALS.CUSTOMER.organization,
        location: DEMO_CREDENTIALS.CUSTOMER.location,
        avatar: '👤'
      };
      setUser(u);
      return { success: true, user: u };
    }

    return {
      success: false,
      error: 'Account not recognized. Please use one of the registered role accounts (Owner, Vendor, Customer).'
    };
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    const cred = DEMO_CREDENTIALS[newRole];
    const u: User = {
      id: `usr-${newRole.toLowerCase()}-auto`,
      name: cred.name,
      email: cred.email,
      role: newRole,
      organization: cred.organization,
      location: cred.location,
      avatar: newRole === 'OWNER' ? '👑' : newRole === 'VENDOR' ? '🏢' : '👤'
    };
    setUser(u);
  };

  const quickFill = (r: UserRole) => {
    return {
      email: DEMO_CREDENTIALS[r].email,
      pass: DEMO_CREDENTIALS[r].password
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        quickFill
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
