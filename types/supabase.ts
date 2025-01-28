export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      notebooks: {
        Row: {
          id: string
          title: string
          created_at: string
          syllabus_id: string | null
        }
        Insert: {
          id?: string
          title: string
          created_at?: string
          syllabus_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          created_at?: string
          syllabus_id?: string | null
        }
      }
      generated_features: {
        Row: {
          id: string
          notebook_id: string
          name: string
          description: string
          type: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          notebook_id: string
          name: string
          description: string
          type: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          notebook_id?: string
          name?: string
          description?: string
          type?: string
          reference_id?: string | null
          created_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          notebook_id: string
          file_name: string
          file_type: string
          summary: string
          created_at: string
        }
        Insert: {
          id?: string
          notebook_id: string
          file_name: string
          file_type: string
          summary: string
          created_at?: string
        }
        Update: {
          id?: string
          notebook_id?: string
          file_name?: string
          file_type?: string
          summary?: string
          created_at?: string
        }
      }
      chunks: {
        Row: {
          id: string
          source_id: string
          content: string
          embedding: number[]
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          content: string
          embedding: number[]
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          content?: string
          embedding?: number[]
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          notebook_id: string
          created_at: string
        }
        Insert: {
          id?: string
          notebook_id: string
          created_at?: string
        }
        Update: {
          id?: string
          notebook_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          created_at?: string
        }
      }
      syllabi: {
        Row: {
          id: string
          notebook_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          notebook_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          notebook_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          syllabus_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          syllabus_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          syllabus_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      pedagogical_approaches: {
        Row: {
          id: string
          syllabus_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          syllabus_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          syllabus_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          notebook_id: string
        }
        Returns: {
          id: string
          content: string
          similarity: number
          file_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

