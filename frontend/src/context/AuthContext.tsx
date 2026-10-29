import { getApiBaseUrl } from '../services/apiConfig';
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
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Authenticate with real localhost FastAPI backend API (/api/auth/login)
    try {
      const endpoints = [
        '/api/auth/login',
        `${getApiBaseUrl()}/api/auth/login`,
        'http://127.0.0.1:8000/api/auth/login'
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              email: normalizedEmail,
              password: cleanPass
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
              localStorage.setItem('dharm_access_token', data.access_token);
            }
            if (data.user) {
              const roleStr = (data.user.role?.toUpperCase() || 'OWNER') as UserRole;
              const u: User = {
                id: data.user.id || 'usr-owner-01',
                name: data.user.name,
                email: data.user.email,
                role: roleStr,
                organization: data.user.organization || 'Apex Global Logistics & Medical Supply',
                location: data.user.location || 'Central Distribution Center, Hub Alpha',
                avatar: data.user.avatar || (roleStr === 'OWNER' ? '👑' : roleStr === 'VENDOR' ? '🏢' : '👤')
              };
              setUser(u);
              return { success: true, user: u };
            }
          } else if (response.status === 401 || response.status === 422) {
            const errJson = await response.json().catch(() => null);
            return {
              success: false,
              error: errJson?.detail || 'Invalid email or password'
            };
          }
        } catch {
          // Try next endpoint candidate
          continue;
        }
      }
    } catch (e) {
      console.warn('API connection fallback active:', e);
    }

    // 2. Resilient demo fallback if localhost:8000 backend is not started
    await new Promise(r => setTimeout(r, 200));

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
      error: 'Account not recognized. Please use registered account (hey.dhruvs20@gmail.com, Sinugunshetty@gmail.com, or anusha.s2028@gmail.com).'
    };
  };

  const logout = () => {
    localStorage.removeItem('dharm_access_token');
    localStorage.removeItem('dharm_auth_user');
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    const cred = DEMO_CREDENTIALS[newRole];
    const u: User = {
      id: newRole === 'OWNER' ? 'usr-owner-01' : newRole === 'VENDOR' ? 'usr-vendor-02' : 'usr-cust-03',
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
