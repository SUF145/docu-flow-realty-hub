-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tenant_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Add tenant_id to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_folders_tenant_id ON folders(tenant_id);

-- Add tenant_id to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);

-- Add tenant_id to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_id ON templates(tenant_id);

-- Add tenant_id to user_onboarding table
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_tenant_id ON user_onboarding(tenant_id);

-- Create function to get current tenant ID from claims
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_claim UUID;
BEGIN
    tenant_claim := (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::UUID;
    RETURN tenant_claim;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Anyone can view active tenants (for domain validation)
CREATE POLICY "Anyone can view active tenants"
  ON tenants FOR SELECT
  USING (is_active = TRUE);

-- Only super admins can insert tenants (handled in application code)
CREATE POLICY "Only super admins can insert tenants"
  ON tenants FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- Only super admins can update tenants
CREATE POLICY "Only super admins can update tenants"
  ON tenants FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() OR 
    auth.uid() = id
  );

-- Update RLS policies for folders table
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
CREATE POLICY "Users can view folders in their tenant"
  ON folders FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (auth.uid() = created_by OR created_by IS NULL)
  );

DROP POLICY IF EXISTS "Users can insert their own folders" ON folders;
CREATE POLICY "Users can insert folders in their tenant"
  ON folders FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
CREATE POLICY "Users can update folders in their tenant"
  ON folders FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
CREATE POLICY "Users can delete folders in their tenant"
  ON folders FOR DELETE
  USING (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

-- Update RLS policies for documents table
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view documents in their tenant"
  ON documents FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (auth.uid() = created_by OR created_by IS NULL)
  );

DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users can insert documents in their tenant"
  ON documents FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update documents in their tenant"
  ON documents FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete documents in their tenant"
  ON documents FOR DELETE
  USING (
    tenant_id = get_current_tenant_id() AND
    auth.uid() = created_by
  );

-- Update RLS policies for templates table
DROP POLICY IF EXISTS "Anyone can view templates" ON templates;
CREATE POLICY "Users can view templates in their tenant or public templates"
  ON templates FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() OR
    tenant_id IS NULL
  );

-- Create a default tenant for development
INSERT INTO tenants (name, domain)
VALUES ('Default Tenant', 'default.docuflow.com')
ON CONFLICT (domain) DO NOTHING;

-- Create a function to set tenant_id on user creation
CREATE OR REPLACE FUNCTION set_tenant_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
    tenant_claim UUID;
BEGIN
    -- Try to get tenant_id from JWT claims
    BEGIN
        tenant_claim := (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            tenant_claim := NULL;
    END;
    
    -- If tenant_id is in claims, use it
    IF tenant_claim IS NOT NULL THEN
        UPDATE profiles SET tenant_id = tenant_claim WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set tenant_id after profile creation
DROP TRIGGER IF EXISTS set_tenant_id_on_profile_creation ON profiles;
CREATE TRIGGER set_tenant_id_on_profile_creation
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_tenant_for_new_user();

-- Update the create_root_folder_for_user function to include tenant_id
CREATE OR REPLACE FUNCTION create_root_folder_for_user()
RETURNS TRIGGER AS $$
DECLARE
    tenant_claim UUID;
BEGIN
    -- Try to get tenant_id from JWT claims
    BEGIN
        tenant_claim := (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            tenant_claim := NULL;
    END;
    
    -- Insert root folder with tenant_id
    INSERT INTO folders (name, created_by, tenant_id)
    VALUES ('Root', NEW.id, tenant_claim);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
