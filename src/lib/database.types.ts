export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          credits: number;
          is_admin: boolean;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          credits?: number;
          is_admin?: boolean;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          credits?: number;
          is_admin?: boolean;
          created_at?: string;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      saves: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          fixed_memory: string;
          rolling_summary: string;
          summarized_turn_count: number;
          turns: Json;
          archive: string;
          turn_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          fixed_memory?: string;
          rolling_summary?: string;
          summarized_turn_count?: number;
          turns?: Json;
          archive?: string;
          turn_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          fixed_memory?: string;
          rolling_summary?: string;
          summarized_turn_count?: number;
          turns?: Json;
          archive?: string;
          turn_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
