-- Drop the existing function
DROP FUNCTION IF EXISTS match_chunks;

-- Recreate the function with the correct return type
CREATE OR REPLACE FUNCTION match_chunks(query_embedding vector(1536), match_threshold float, match_count int)
RETURNS TABLE(
  id bigint,
  content text,
  similarity float,
  source_id bigint,
  file_name text,
  notebook_id bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) AS similarity,
    chunks.source_id,
    sources.file_name,
    sources.notebook_id
  FROM
    chunks
  JOIN
    sources ON chunks.source_id = sources.id
  WHERE 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY
    chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

