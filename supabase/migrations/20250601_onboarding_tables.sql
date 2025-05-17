-- Create industry segments table
CREATE TABLE IF NOT EXISTS industry_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name for UI display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folder templates table
CREATE TABLE IF NOT EXISTS folder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    industry_segment_id UUID REFERENCES industry_segments(id),
    structure JSONB NOT NULL, -- JSON structure of folders and subfolders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document templates association table
CREATE TABLE IF NOT EXISTS folder_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_template_id UUID REFERENCES folder_templates(id),
    folder_path TEXT NOT NULL, -- Path within the folder structure (e.g., "Contracts/Leases")
    template_id UUID REFERENCES templates(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user onboarding status table
CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    is_onboarded BOOLEAN DEFAULT FALSE,
    industry_segment_id UUID REFERENCES industry_segments(id),
    folder_template_id UUID REFERENCES folder_templates(id),
    onboarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for industry segments table
ALTER TABLE industry_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view industry segments"
  ON industry_segments FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert industry segments"
  ON industry_segments FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update industry segments"
  ON industry_segments FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for folder templates table
ALTER TABLE folder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view folder templates"
  ON folder_templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert folder templates"
  ON folder_templates FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update folder templates"
  ON folder_templates FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for folder document templates table
ALTER TABLE folder_document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view folder document templates"
  ON folder_document_templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert folder document templates"
  ON folder_document_templates FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for user onboarding table
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding status"
  ON user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status"
  ON user_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
  ON user_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert default industry segments
INSERT INTO industry_segments (name, description, icon) VALUES
('Residential Real Estate', 'Buying, selling, and managing residential properties', 'home'),
('Commercial Real Estate', 'Office, retail, industrial, and other commercial properties', 'building'),
('Property Management', 'Managing properties on behalf of owners', 'key'),
('Real Estate Development', 'Construction and development of new properties', 'construction');

-- Insert default folder templates for Residential Real Estate
INSERT INTO folder_templates (name, description, industry_segment_id, structure)
SELECT
    'Basic Residential Structure',
    'A simple folder structure for residential real estate agents',
    id,
    '{
        "folders": [
            {
                "name": "Listings",
                "description": "Active property listings",
                "folders": [
                    {"name": "Active Listings", "description": "Currently active listings"},
                    {"name": "Pending Listings", "description": "Listings under contract"},
                    {"name": "Closed Listings", "description": "Completed transactions"}
                ]
            },
            {
                "name": "Clients",
                "description": "Client information and documents",
                "folders": [
                    {"name": "Buyers", "description": "Buyer clients"},
                    {"name": "Sellers", "description": "Seller clients"}
                ]
            },
            {
                "name": "Contracts",
                "description": "All contracts and agreements",
                "folders": [
                    {"name": "Purchase Agreements", "description": "Property purchase contracts"},
                    {"name": "Listing Agreements", "description": "Seller listing agreements"},
                    {"name": "Disclosures", "description": "Property disclosure forms"}
                ]
            },
            {
                "name": "Marketing",
                "description": "Marketing materials and templates",
                "folders": [
                    {"name": "Property Photos", "description": "Listing photographs"},
                    {"name": "Brochures", "description": "Marketing brochures"},
                    {"name": "Advertisements", "description": "Ad materials"}
                ]
            }
        ]
    }'::jsonb
FROM industry_segments
WHERE name = 'Residential Real Estate';

-- Insert default folder templates for Commercial Real Estate
INSERT INTO folder_templates (name, description, industry_segment_id, structure)
SELECT
    'Commercial Property Structure',
    'Folder structure for commercial real estate professionals',
    id,
    '{
        "folders": [
            {
                "name": "Properties",
                "description": "Commercial property listings and information",
                "folders": [
                    {"name": "Office", "description": "Office properties"},
                    {"name": "Retail", "description": "Retail properties"},
                    {"name": "Industrial", "description": "Industrial properties"},
                    {"name": "Mixed-Use", "description": "Mixed-use properties"}
                ]
            },
            {
                "name": "Leases",
                "description": "Lease agreements and related documents",
                "folders": [
                    {"name": "Active Leases", "description": "Current lease agreements"},
                    {"name": "Lease Renewals", "description": "Upcoming lease renewals"},
                    {"name": "Lease Templates", "description": "Template lease documents"}
                ]
            },
            {
                "name": "Due Diligence",
                "description": "Property due diligence documents",
                "folders": [
                    {"name": "Financial Reports", "description": "Financial analysis and reports"},
                    {"name": "Property Inspections", "description": "Inspection reports"},
                    {"name": "Environmental", "description": "Environmental assessments"}
                ]
            },
            {
                "name": "Transactions",
                "description": "Purchase and sale transactions",
                "folders": [
                    {"name": "Acquisitions", "description": "Property acquisitions"},
                    {"name": "Dispositions", "description": "Property sales"},
                    {"name": "Closing Documents", "description": "Transaction closing documents"}
                ]
            }
        ]
    }'::jsonb
FROM industry_segments
WHERE name = 'Commercial Real Estate';

-- Insert default folder templates for Property Management
INSERT INTO folder_templates (name, description, industry_segment_id, structure)
SELECT
    'Property Management Structure',
    'Folder structure for property management companies',
    id,
    '{
        "folders": [
            {
                "name": "Properties",
                "description": "Managed properties",
                "folders": [
                    {"name": "Residential", "description": "Residential properties"},
                    {"name": "Commercial", "description": "Commercial properties"}
                ]
            },
            {
                "name": "Tenants",
                "description": "Tenant information and documents",
                "folders": [
                    {"name": "Active Tenants", "description": "Current tenants"},
                    {"name": "Former Tenants", "description": "Past tenants"},
                    {"name": "Applicants", "description": "Rental applicants"}
                ]
            },
            {
                "name": "Leases",
                "description": "Lease agreements",
                "folders": [
                    {"name": "Residential Leases", "description": "Residential lease agreements"},
                    {"name": "Commercial Leases", "description": "Commercial lease agreements"}
                ]
            },
            {
                "name": "Maintenance",
                "description": "Property maintenance records",
                "folders": [
                    {"name": "Work Orders", "description": "Maintenance work orders"},
                    {"name": "Vendor Contracts", "description": "Service provider contracts"},
                    {"name": "Inspections", "description": "Property inspection reports"}
                ]
            },
            {
                "name": "Financial",
                "description": "Financial records",
                "folders": [
                    {"name": "Rent Payments", "description": "Rent payment records"},
                    {"name": "Expenses", "description": "Property expenses"},
                    {"name": "Owner Statements", "description": "Owner financial statements"}
                ]
            }
        ]
    }'::jsonb
FROM industry_segments
WHERE name = 'Property Management';

-- Insert default folder templates for Real Estate Development
INSERT INTO folder_templates (name, description, industry_segment_id, structure)
SELECT
    'Development Project Structure',
    'Folder structure for real estate development projects',
    id,
    '{
        "folders": [
            {
                "name": "Projects",
                "description": "Development projects",
                "folders": [
                    {"name": "Active Projects", "description": "Current development projects"},
                    {"name": "Completed Projects", "description": "Finished development projects"},
                    {"name": "Prospective Projects", "description": "Potential future projects"}
                ]
            },
            {
                "name": "Planning",
                "description": "Project planning documents",
                "folders": [
                    {"name": "Site Plans", "description": "Property site plans"},
                    {"name": "Architectural Drawings", "description": "Architectural designs"},
                    {"name": "Engineering", "description": "Engineering documents"}
                ]
            },
            {
                "name": "Permits",
                "description": "Permits and approvals",
                "folders": [
                    {"name": "Building Permits", "description": "Construction permits"},
                    {"name": "Environmental Permits", "description": "Environmental approvals"},
                    {"name": "Zoning", "description": "Zoning documents"}
                ]
            },
            {
                "name": "Construction",
                "description": "Construction documents",
                "folders": [
                    {"name": "Contracts", "description": "Construction contracts"},
                    {"name": "Schedules", "description": "Project schedules"},
                    {"name": "Inspections", "description": "Construction inspections"}
                ]
            },
            {
                "name": "Financial",
                "description": "Project financials",
                "folders": [
                    {"name": "Budgets", "description": "Project budgets"},
                    {"name": "Funding", "description": "Project funding documents"},
                    {"name": "Expenses", "description": "Project expenses"}
                ]
            },
            {
                "name": "Sales",
                "description": "Sales and marketing",
                "folders": [
                    {"name": "Marketing Materials", "description": "Project marketing"},
                    {"name": "Sales Contracts", "description": "Unit sales contracts"},
                    {"name": "Closings", "description": "Sales closing documents"}
                ]
            }
        ]
    }'::jsonb
FROM industry_segments
WHERE name = 'Real Estate Development';
