# DocuFlow Realty Hub

A document management system for real estate professionals, featuring document workflows, approvals, and collaboration.

## Features

- 📄 Document Management: Upload, organize, and track all your real estate documents
- ✅ Approval Workflows: Route documents for review and approval
- 🔍 Document Search: Quickly find what you need
- 📊 Dashboard: Get insights into document status and pending approvals
- 👥 User Management: Control access and permissions

## Technology Stack

- Frontend: React with Vite
- UI Components: Shadcn UI
- Backend: Supabase (Authentication, Database, Storage)
- PDF Processing: pdf-lib

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/docu-flow-realty-hub.git
   cd docu-flow-realty-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL script in `supabase/migrations/20250512_document_management_tables.sql` in the Supabase SQL Editor to create the necessary tables and policies
   - Create a storage bucket named `documents` with public access

4. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase URL and anon key:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Supabase Database Schema

The application uses the following tables:

### documents
- `id`: UUID (Primary Key)
- `title`: Text (Required)
- `description`: Text
- `file_path`: Text
- `file_size`: Integer
- `file_type`: Text
- `status`: Text (draft, pending, approved, rejected)
- `created_by`: UUID (Foreign Key to auth.users)
- `document_type_id`: UUID (Foreign Key to document_types)
- `metadata`: JSONB
- `created_at`: Timestamp
- `updated_at`: Timestamp

### document_approvals
- `id`: UUID (Primary Key)
- `document_id`: UUID (Foreign Key to documents)
- `approver_id`: UUID (Foreign Key to auth.users)
- `status`: Text (pending, approved, rejected)
- `comments`: Text
- `approved_at`: Timestamp
- `order_sequence`: Integer
- `created_at`: Timestamp
- `updated_at`: Timestamp

### comments
- `id`: UUID (Primary Key)
- `document_id`: UUID (Foreign Key to documents)
- `user_id`: UUID (Foreign Key to auth.users)
- `content`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### activity_logs
- `id`: UUID (Primary Key)
- `document_id`: UUID (Foreign Key to documents)
- `user_id`: UUID (Foreign Key to auth.users)
- `action`: Text
- `details`: JSONB
- `created_at`: Timestamp

### profiles
- `id`: UUID (Primary Key, Foreign Key to auth.users)
- `name`: Text
- `email`: Text
- `avatar_url`: Text
- `status`: Text
- `role`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### document_types
- `id`: UUID (Primary Key)
- `name`: Text
- `description`: Text
- `required_approvals`: Integer
- `sla`: Integer (Service Level Agreement in hours)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### roles
- `id`: UUID (Primary Key)
- `name`: Text
- `description`: Text
- `permissions`: JSONB
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Troubleshooting

If you encounter issues with document uploads or other Supabase operations:

1. Check the browser console for detailed error messages
2. Verify that your Supabase tables are set up correctly
3. Ensure the storage bucket exists and has the correct permissions
4. Check that your environment variables are set correctly

## License

MIT
