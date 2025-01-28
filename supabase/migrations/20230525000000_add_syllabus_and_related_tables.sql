-- Create syllabi table
CREATE TABLE syllabi (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create activities table
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  syllabus_id UUID REFERENCES syllabi(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create pedagogical_approaches table
CREATE TABLE pedagogical_approaches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  syllabus_id UUID REFERENCES syllabi(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add syllabus_id to notebooks table
ALTER TABLE notebooks ADD COLUMN syllabus_id UUID REFERENCES syllabi(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_syllabi_notebook_id ON syllabi(notebook_id);
CREATE INDEX idx_activities_syllabus_id ON activities(syllabus_id);
CREATE INDEX idx_pedagogical_approaches_syllabus_id ON pedagogical_approaches(syllabus_id);
CREATE INDEX idx_notebooks_syllabus_id ON notebooks(syllabus_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column for syllabi
CREATE TRIGGER update_syllabi_updated_at
BEFORE UPDATE ON syllabi
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

