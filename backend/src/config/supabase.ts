// src/config/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required. Please check your .env file.");
}

if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_KEY is required. Please check your .env file."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "SUPABASE_ANON_KEY is required. Please check your .env file."
  );
}

// Service role client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client for real-time subscriptions
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password: string;
          role: "ADMIN" | "USER";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          email: string;
          password: string;
          role?: "ADMIN" | "USER";
        };
        Update: {
          email?: string;
          password?: string;
          role?: "ADMIN" | "USER";
        };
      };
      forms: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          share_code: string;
          is_active: boolean;
          created_by_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string;
          share_code: string;
          created_by_id: string;
        };
        Update: {
          title?: string;
          description?: string;
          is_active?: boolean;
        };
      };
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          label: string;
          type:
            | "TEXT"
            | "NUMBER"
            | "EMAIL"
            | "DROPDOWN"
            | "TEXTAREA"
            | "CHECKBOX"
            | "RADIO";
          required: boolean;
          options: string[];
          field_order: number;
          created_at: string;
        };
        Insert: {
          form_id: string;
          label: string;
          type:
            | "TEXT"
            | "NUMBER"
            | "EMAIL"
            | "DROPDOWN"
            | "TEXTAREA"
            | "CHECKBOX"
            | "RADIO";
          required?: boolean;
          options?: string[];
          field_order: number;
        };
      };
      form_responses: {
        Row: {
          id: string;
          form_id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          form_id: string;
          user_id: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      response_fields: {
        Row: {
          id: string;
          response_id: string;
          field_id: string;
          value: string;
        };
        Insert: {
          response_id: string;
          field_id: string;
          value: string;
        };
        Update: {
          value: string;
        };
      };
      field_locks: {
        Row: {
          id: string;
          user_id: string;
          form_id: string;
          field_id: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          form_id: string;
          field_id: string;
          expires_at: string;
        };
        Update: {
          expires_at: string;
        };
      };
    };
  };
}
