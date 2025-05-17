import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  primary_color?: string;
  is_active: boolean;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  isLoadingTenant: boolean;
  validateTenant: (domain: string) => Promise<Tenant | null>;
  clearTenant: () => void;
  tenantError: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    // Check if tenant is stored in sessionStorage (persists only for current session)
    const storedTenant = sessionStorage.getItem('currentTenant');
    if (storedTenant) {
      try {
        const tenant = JSON.parse(storedTenant);
        setCurrentTenant(tenant);
      } catch (error) {
        console.error('Error parsing stored tenant:', error);
        sessionStorage.removeItem('currentTenant');
      }
    }
    setIsLoadingTenant(false);
  }, []);

  // Save tenant to sessionStorage when it changes
  useEffect(() => {
    if (currentTenant) {
      sessionStorage.setItem('currentTenant', JSON.stringify(currentTenant));
    } else {
      sessionStorage.removeItem('currentTenant');
    }
  }, [currentTenant]);

  // Function to clear tenant
  const clearTenant = () => {
    sessionStorage.removeItem('currentTenant');
    setCurrentTenant(null);
  };

  // Function to validate tenant
  const validateTenant = async (domain: string): Promise<Tenant | null> => {
    setIsLoadingTenant(true);
    setTenantError(null);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', domain)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error validating tenant:', error);
        setTenantError('Invalid tenant. Please check and try again.');
        return null;
      }

      if (!data) {
        setTenantError('Tenant not found. Please check the name and try again.');
        return null;
      }

      // Set the current tenant
      setCurrentTenant(data);
      return data;
    } catch (error) {
      console.error('Exception in validateTenant:', error);
      setTenantError('An error occurred while validating the tenant. Please try again.');
      return null;
    } finally {
      setIsLoadingTenant(false);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    currentTenant,
    setCurrentTenant,
    isLoadingTenant,
    validateTenant,
    clearTenant,
    tenantError
  }), [currentTenant, isLoadingTenant, tenantError]);

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
