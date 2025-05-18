-- Create a function to get column names for a table
CREATE OR REPLACE FUNCTION get_column_names(table_name text)
RETURNS text[] AS $$
DECLARE
    result text[];
BEGIN
    SELECT array_agg(column_name::text)
    INTO result
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_column_names(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_column_names(text) TO anon;
