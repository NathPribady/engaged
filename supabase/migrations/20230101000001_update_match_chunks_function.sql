CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  notebook_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  file_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) AS similarity,
    sources.file_name
  FROM
    chunks
  JOIN
    sources ON chunks.source_id = sources.id
  WHERE
    sources.notebook_id = match_chunks.notebook_id
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY
    chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

