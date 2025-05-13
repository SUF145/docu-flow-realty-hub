-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_template_url TEXT NOT NULL, -- Link to template file in Supabase Storage
    placeholders JSONB DEFAULT '{}', -- Optional metadata to dynamically replace fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for templates table
DROP POLICY IF EXISTS "Users can view all templates" ON templates;
CREATE POLICY "Users can view all templates"
  ON templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert templates" ON templates;
CREATE POLICY "Authenticated users can insert templates"
  ON templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update templates" ON templates;
CREATE POLICY "Authenticated users can update templates"
  ON templates FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  -- Check if the bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'templates'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
    
    -- Create policy to allow authenticated users to upload files
    INSERT INTO storage.policies (name, definition, bucket_id)
    VALUES (
      'Allow authenticated users to upload template files',
      '{"bucket_id":"templates","owner":null,"public":true,"read":true,"write":true}',
      'templates'
    );
  END IF;
END $$;

-- Sample Templates (optional seed)
INSERT INTO templates (title, description, file_template_url) VALUES
('Sale Agreement', 'Agreement format for property sale', 'https://awozuursgyowogkquzlz.supabase.co/storage/v1/object/public/templates/sale_agreement.docx'),
('Construction Contract', 'Template for a builder-contractor agreement', 'https://awozuursgyowogkquzlz.supabase.co/storage/v1/object/public/templates/construction_contract.docx'),
('Allotment Letter', 'Letter format for property allotment', 'https://awozuursgyowogkquzlz.supabase.co/storage/v1/object/public/templates/allotment_letter.docx')
ON CONFLICT (id) DO NOTHING;
