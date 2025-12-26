import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'site_access_token';

interface UsePasswordProtectionResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

export function usePasswordProtection(): UsePasswordProtectionResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('verify-site-password', {
        body: { password },
      });

      if (invokeError) {
        console.error('Error invoking verify-site-password:', invokeError);
        setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        setIsLoading(false);
        return false;
      }

      if (data?.success && data?.token) {
        localStorage.setItem(STORAGE_KEY, data.token);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        setError(data?.error || 'Falsches Passwort');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
  };
}
