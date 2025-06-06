import { useState, useEffect, useContext, createContext } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';

// ... (seus tipos permanecem os mesmos)

// Criação do contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Implementação do Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ... (toda a implementação do provider que você já tem)
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        register,
        forgotPassword,
        resetPassword,
        refreshToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// auth.ts
if (!window.__useAuthDefined) {
  export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
  }
  window.__useAuthDefined = true;
}
