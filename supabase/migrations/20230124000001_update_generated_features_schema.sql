-- Drop the existing generated_features table if it exists
DROP TABLE IF EXISTS generated_features;

-- Create generated_features table with updated schema
CREATE TABLE generated_features (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reference_id UUID -- This will store the ID of the related content (e.g., syllabus_id)
);

-- Add index for better query performance
CREATE INDEX idx_generated_features_notebook_id ON generated_features(notebook_id);
CREATE INDEX idx_generated_features_reference_id ON generated_features(reference_id);

