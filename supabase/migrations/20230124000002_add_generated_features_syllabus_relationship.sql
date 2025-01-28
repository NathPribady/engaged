-- Add foreign key constraint to generated_features table
ALTER TABLE generated_features
ADD CONSTRAINT fk_generated_features_syllabi
FOREIGN KEY (reference_id) REFERENCES syllabi(id)
ON DELETE SET NULL;

