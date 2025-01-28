-- Create generated_features table
CREATE TABLE generated_features (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add index for better query performance
CREATE INDEX idx_generated_features_notebook_id ON generated_features(notebook_id);

