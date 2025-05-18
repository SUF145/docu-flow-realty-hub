
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkUserOnboarding, initializeUserOnboarding } from '@/lib/onboarding';
import { useTenant } from '@/contexts/TenantContext';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    role?: string;
    tenant_id?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirstLogin: boolean;
  isAdmin: boolean;
  isCheckingOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { currentTenant, clearTenant } = useTenant();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  useEffect(() => {
    // Check if the user is already authenticated
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const userData = session.user as User;
          setUser(userData);

          // Check if user is admin
          setIsAdmin(userData.user_metadata?.role === 'admin');

          // Check if user belongs to the current tenant
          // For existing sessions, we need to be more lenient to avoid sign-out loops
          const userTenantId = userData.user_metadata?.tenant_id;

          // If user has a tenant_id in metadata but no currentTenant is selected,
          // we should try to fetch and set that tenant
          if (userTenantId && !currentTenant) {
            try {
              console.log("User has tenant_id but no tenant selected, fetching tenant");
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', userTenantId)
                .eq('is_active', true)
                .single();

              if (tenantData) {
                // Set the tenant context without clearing the current session
                sessionStorage.setItem('currentTenant', JSON.stringify(tenantData));
                // We don't call setCurrentTenant directly to avoid dependency cycle
              }
            } catch (tenantError) {
              console.error("Error fetching tenant:", tenantError);
            }
          }
          // Only sign out if there's a definite mismatch between selected tenant and user tenant
          else if (currentTenant && userTenantId && userTenantId !== currentTenant.id) {
            // User is logged in but with a different tenant - sign out
            console.log("User tenant mismatch, signing out");
            await supabase.auth.signOut();
            clearTenant();
            setUser(null);
            setLoading(false);
            return;
          }

          // Check if this is the first login (not onboarded yet)
          setIsCheckingOnboarding(true);
          try {
            if (!currentTenant) {
              setIsCheckingOnboarding(false);
              return;
            }

            console.log(`Checking onboarding status for user ${userData.id} in tenant ${currentTenant.id}`);

            // Use maybeSingle instead of single to avoid 406 errors
            const { data, error } = await supabase
              .from('user_onboarding')
              .select('*')
              .eq('user_id', userData.id)
              .eq('tenant_id', currentTenant.id)
              .maybeSingle();

            console.log("Onboarding query result:", { data, error });

            // Check if user has completed onboarding (from localStorage)
            const userOnboarded = localStorage.getItem('userOnboarded') === 'true';
            console.log("AuthContext - User onboarded status from localStorage:", userOnboarded);

            // For debugging, check if there's a URL parameter to force onboarding
            const urlParams = new URLSearchParams(window.location.search);
            const forceOnboarding = urlParams.get('forceOnboarding') === 'true';

            if (forceOnboarding) {
              console.log("Force onboarding parameter detected, setting isFirstLogin to true");
              localStorage.removeItem('userOnboarded');
              setIsFirstLogin(true);
            } else if (userOnboarded) {
              // If localStorage says user is onboarded, trust that
              console.log("User marked as onboarded in localStorage");
              setIsFirstLogin(false);

              // Update the database record if needed
              if (error || !data || !data.is_onboarded) {
                console.log("Updating user onboarding status in database");

                // First check if a record exists
                const { data: existingRecord, error: checkError } = await supabase
                  .from('user_onboarding')
                  .select('*')
                  .eq('user_id', userData.id)
                  .eq('tenant_id', currentTenant.id)
                  .maybeSingle();

                console.log("Existing onboarding record check:", { existingRecord, checkError });

                if (existingRecord) {
                  // Update existing record
                  console.log("Updating existing onboarding record");
                  await supabase
                    .from('user_onboarding')
                    .update({
                      is_onboarded: true,
                      onboarded_at: new Date().toISOString()
                    })
                    .eq('user_id', userData.id)
                    .eq('tenant_id', currentTenant.id);
                } else {
                  // Insert new record
                  console.log("Creating new onboarding record");
                  await supabase
                    .from('user_onboarding')
                    .insert([{
                      user_id: userData.id,
                      tenant_id: currentTenant.id,
                      is_onboarded: true,
                      onboarded_at: new Date().toISOString()
                    }]);
                }
              }
            } else if (error || !data) {
              // No onboarding record found, this might be first login
              console.log("No onboarding record found, marking as first login");
              setIsFirstLogin(true);
              // Initialize onboarding record using upsert to avoid duplicate key errors
              await supabase
                .from('user_onboarding')
                .upsert({
                  user_id: userData.id,
                  tenant_id: currentTenant.id,
                  is_onboarded: false
                }, { onConflict: 'user_id' });
            } else {
              // Onboarding record exists, check if onboarded
              console.log("Onboarding record exists, is_onboarded:", data.is_onboarded);
              setIsFirstLogin(!data.is_onboarded);

              // If database says user is onboarded, update localStorage
              if (data.is_onboarded) {
                localStorage.setItem('userOnboarded', 'true');
              }
            }
          } catch (err) {
            console.error('Error checking onboarding status:', err);
            // Assume not first login in case of error
            setIsFirstLogin(false);
          } finally {
            setIsCheckingOnboarding(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setError('Failed to retrieve authentication status.');
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`, session?.user?.id);

        if (session) {
          const userData = session.user as User;
          console.log("User metadata:", userData.user_metadata);
          console.log("Current tenant:", currentTenant);

          setUser(userData);

          // Check if user is admin
          const isUserAdmin = userData.user_metadata?.role === 'admin';
          console.log(`User is admin: ${isUserAdmin}`);
          setIsAdmin(isUserAdmin);

          // Check if user belongs to the current tenant
          // Only perform this check if it's not a new sign-in event
          // For new sign-ins, we trust the tenant_id that was just set during signIn
          const userTenantId = userData.user_metadata?.tenant_id;
          console.log(`User tenant ID: ${userTenantId}, Current tenant ID: ${currentTenant?.id}`);

          if (event !== 'SIGNED_IN' && currentTenant && userTenantId && userTenantId !== currentTenant.id) {
            // User is logged in but with a different tenant - sign out
            console.log("User tenant mismatch, signing out");
            await supabase.auth.signOut();
            clearTenant();
            setUser(null);
            setLoading(false);
            return;
          }

          // If this is a new sign-in, check onboarding status
          if (event === 'SIGNED_IN' && currentTenant) {
            setIsCheckingOnboarding(true);
            try {
              console.log(`Checking onboarding status for user ${userData.id} in tenant ${currentTenant.id} (auth state change)`);

              // Use maybeSingle instead of single to avoid 406 errors
              const { data, error } = await supabase
                .from('user_onboarding')
                .select('*')
                .eq('user_id', userData.id)
                .eq('tenant_id', currentTenant.id)
                .maybeSingle();

              console.log("Onboarding query result (auth state change):", { data, error });

              // Check if user has completed onboarding (from localStorage)
              const userOnboarded = localStorage.getItem('userOnboarded') === 'true';
              console.log("AuthContext (auth state change) - User onboarded status from localStorage:", userOnboarded);

              // For debugging, check if there's a URL parameter to force onboarding
              const urlParams = new URLSearchParams(window.location.search);
              const forceOnboarding = urlParams.get('forceOnboarding') === 'true';

              if (forceOnboarding) {
                console.log("Force onboarding parameter detected, setting isFirstLogin to true (auth state change)");
                localStorage.removeItem('userOnboarded');
                setIsFirstLogin(true);
              } else if (userOnboarded) {
                // If localStorage says user is onboarded, trust that
                console.log("User marked as onboarded in localStorage (auth state change)");
                setIsFirstLogin(false);

                // Update the database record if needed
                if (error || !data || !data.is_onboarded) {
                  console.log("Updating user onboarding status in database (auth state change)");

                  // First check if a record exists
                  const { data: existingRecord, error: checkError } = await supabase
                    .from('user_onboarding')
                    .select('*')
                    .eq('user_id', userData.id)
                    .eq('tenant_id', currentTenant.id)
                    .maybeSingle();

                  console.log("Existing onboarding record check (auth state change):", { existingRecord, checkError });

                  if (existingRecord) {
                    // Update existing record
                    console.log("Updating existing onboarding record (auth state change)");
                    await supabase
                      .from('user_onboarding')
                      .update({
                        is_onboarded: true,
                        onboarded_at: new Date().toISOString()
                      })
                      .eq('user_id', userData.id)
                      .eq('tenant_id', currentTenant.id);
                  } else {
                    // Insert new record
                    console.log("Creating new onboarding record (auth state change)");
                    await supabase
                      .from('user_onboarding')
                      .insert([{
                        user_id: userData.id,
                        tenant_id: currentTenant.id,
                        is_onboarded: true,
                        onboarded_at: new Date().toISOString()
                      }]);
                  }
                }
              } else if (error || !data) {
                setIsFirstLogin(true);
                // Initialize onboarding record using upsert to avoid duplicate key errors
                await supabase
                  .from('user_onboarding')
                  .upsert({
                    user_id: userData.id,
                    tenant_id: currentTenant.id,
                    is_onboarded: false
                  }, { onConflict: 'user_id' });
              } else {
                setIsFirstLogin(!data.is_onboarded);

                // If database says user is onboarded, update localStorage
                if (data.is_onboarded) {
                  localStorage.setItem('userOnboarded', 'true');
                }
              }
            } catch (err) {
              console.error('Error in auth state change:', err);
              setIsFirstLogin(false);
            } finally {
              setIsCheckingOnboarding(false);
            }
          }
        } else {
          setUser(null);
          setIsFirstLogin(false);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentTenant, clearTenant]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    // Check if tenant is selected
    if (!currentTenant) {
      setError('No tenant selected. Please select your organization first.');
      setLoading(false);
      return;
    }

    try {
      // First, check if the user exists in this tenant
      // This is a strict check - users must belong to the tenant they're trying to log in to
      let userData = null;
      let userRole = 'user';

      try {
        // Check if user exists in this tenant
        console.log(`Checking if user with email ${email} exists in tenant ${currentTenant.id}`);

        // First check if the role column exists in the profiles table
        try {
          // Try to get just the id first to avoid column errors
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .eq('tenant_id', currentTenant.id)
            .maybeSingle();

          console.log('Profile check result:', { profileData, profileError });

          if (profileData) {
            // User exists in this tenant, but we need to handle the case where role column might not exist
            console.log('User found in this tenant with ID:', profileData.id);
            userData = { id: profileData.id, role: 'user' }; // Default to 'user' role
            userRole = 'user';
          } else {
            console.log('User not found in this tenant');

            // Check if user exists in any tenant, but only query id and tenant_id to avoid column errors
            const { data: anyTenantData } = await supabase
              .from('profiles')
              .select('id, tenant_id')
              .eq('email', email)
              .maybeSingle();

            if (anyTenantData) {
              console.log('User exists but belongs to a different tenant:', anyTenantData.tenant_id);
              throw new Error('User exists but belongs to a different organization. Please contact your administrator.');
            } else {
              console.log('User does not exist in any tenant');
              // We'll continue to authentication to check credentials
              // If auth succeeds, we'll create a new profile for this tenant
            }
          }
        } catch (columnError) {
          console.error('Error querying profiles table (possibly missing column):', columnError);
          // Continue to authentication as a fallback
        }
      } catch (queryError) {
        if (queryError instanceof Error) {
          // If this is our custom error, rethrow it
          if (queryError.message.includes('belongs to a different organization')) {
            throw queryError;
          }
        }
        console.error('Error querying profiles table:', queryError);
        // For other errors, continue to authentication
      }

      // Sign in with tenant context and role
      console.log(`Signing in user with email: ${email}, tenant_id: ${currentTenant.id}, role: ${userRole}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          data: {
            tenant_id: currentTenant.id,
            role: userRole
          }
        }
      });

      if (error) {
        console.error("Authentication error:", error);
        throw error;
      }

      console.log("Authentication successful:", data.user);

      // If we successfully authenticated but didn't find a profile, create one
      // This should only happen for new users who don't exist in any tenant
      if (!userData && data.user) {
        try {
          // Double-check that this user doesn't exist in any tenant
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, tenant_id')
            .eq('email', email)
            .maybeSingle();

          if (existingProfile) {
            // If the user exists in another tenant, this is a security issue
            console.error('User exists in another tenant but was allowed to authenticate');
            throw new Error('User exists in another organization. Please contact your administrator.');
          }

          console.log('Creating new profile for user in this tenant');

          // Create a profile object with the required fields
          const profileData: any = {
            id: data.user.id,
            email: email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            tenant_id: currentTenant.id
          };

          // Check if the role column exists in the profiles table
          try {
            // First try to get the column names from the profiles table
            const { data: columnInfo, error: columnError } = await supabase
              .rpc('get_column_names', { table_name: 'profiles' })
              .catch(() => ({ data: null, error: new Error('RPC not available') }));

            // If we can't get column info or there's an error, try a safer approach
            if (columnError || !columnInfo) {
              console.log('Could not get column info, using a safer approach');
              // Try to add the role field and catch any errors
              try {
                profileData.role = 'user';
              } catch (e) {
                console.error('Error adding role field:', e);
              }
            } else {
              // If we have column info, check if role exists
              const hasRoleColumn = columnInfo.includes('role');
              console.log('Profiles table has role column:', hasRoleColumn);

              if (hasRoleColumn) {
                profileData.role = 'user';
              }
            }
          } catch (e) {
            console.error('Error checking for role column:', e);
            // Try to add the role field anyway and let Supabase handle any errors
            try {
              profileData.role = 'user';
            } catch (e) {
              console.error('Error adding role field:', e);
            }
          }

          console.log('Creating profile with data:', profileData);
          await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });

          console.log('Profile created successfully');
        } catch (profileError) {
          console.error('Error creating/updating profile:', profileError);
          if (profileError instanceof Error &&
              profileError.message.includes('another organization')) {
            // Rethrow our custom error
            throw profileError;
          }
          // For other errors, continue since authentication succeeded
        }
      }

      // Set admin status based on role
      setIsAdmin((data.user as User).user_metadata?.role === 'admin');

      setUser(data.user as User);
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setIsFirstLogin(false);

      // Clear tenant selection when signing out
      clearTenant();

      // Set flag for explicit navigation to tenant selection
      sessionStorage.setItem('explicitTenantNavigation', 'true');

      // Clear onboarding flags
      sessionStorage.removeItem('onboardingComplete');
      localStorage.removeItem('userOnboarded');

      // Redirect to tenant selection
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error signing out:', error);
      setError(error.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isFirstLogin,
      isAdmin,
      isCheckingOnboarding,
      signIn,
      signOut,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
