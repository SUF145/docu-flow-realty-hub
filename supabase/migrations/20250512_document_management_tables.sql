-- Create document_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  required_approvals INTEGER DEFAULT 1,
  sla INTEGER, -- Service Level Agreement in hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  document_type_id UUID REFERENCES document_types(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_approvals table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  order_sequence INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document types if they don't exist
INSERT INTO document_types (name, description, required_approvals, sla)
VALUES
  ('Contract', 'Legal contract documents', 2, 24),
  ('Invoice', 'Payment invoices', 1, 48),
  ('Report', 'Analysis and reporting documents', 1, 72)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for documents table
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = created_by);

-- Create RLS policies for document_approvals table
DROP POLICY IF EXISTS "Users can view approvals for their documents" ON document_approvals;
CREATE POLICY "Users can view approvals for their documents"
  ON document_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_approvals.document_id
    AND documents.created_by = auth.uid()
  ) OR auth.uid() = approver_id);

DROP POLICY IF EXISTS "Users can insert approvals for their documents" ON document_approvals;
CREATE POLICY "Users can insert approvals for their documents"
  ON document_approvals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_approvals.document_id
    AND documents.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update approvals assigned to them" ON document_approvals;
CREATE POLICY "Users can update approvals assigned to them"
  ON document_approvals FOR UPDATE
  USING (auth.uid() = approver_id);

-- Create RLS policies for comments table
DROP POLICY IF EXISTS "Users can view comments on documents they have access to" ON comments;
CREATE POLICY "Users can view comments on documents they have access to"
  ON comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = comments.document_id
    AND (documents.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM document_approvals
      WHERE document_approvals.document_id = comments.document_id
      AND document_approvals.approver_id = auth.uid()
    ))
  ));

DROP POLICY IF EXISTS "Users can insert comments on documents they have access to" ON comments;
CREATE POLICY "Users can insert comments on documents they have access to"
  ON comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = comments.document_id
    AND (documents.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM document_approvals
      WHERE document_approvals.document_id = comments.document_id
      AND document_approvals.approver_id = auth.uid()
    ))
  ));

-- Create RLS policies for activity_logs table
DROP POLICY IF EXISTS "Users can view activity logs for their documents" ON activity_logs;
CREATE POLICY "Users can view activity logs for their documents"
  ON activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = activity_logs.document_id
    AND (documents.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM document_approvals
      WHERE document_approvals.document_id = activity_logs.document_id
      AND document_approvals.approver_id = auth.uid()
    ))
  ));

DROP POLICY IF EXISTS "Users can insert activity logs for their documents" ON activity_logs;
CREATE POLICY "Users can insert activity logs for their documents"
  ON activity_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = activity_logs.document_id
    AND (documents.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM document_approvals
      WHERE document_approvals.document_id = activity_logs.document_id
      AND document_approvals.approver_id = auth.uid()
    ))
  ));

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_approvals_updated_at
BEFORE UPDATE ON document_approvals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
