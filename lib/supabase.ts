import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Supabase - Remplacez par vos vraies clés
const supabaseUrl = 'https://yxkbgrmkfgahaclsyeoe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4a2Jncm1rZmdhaGFjbHN5ZW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjAyNjcsImV4cCI6MjA3MTY5NjI2N30.zaGHz2tZ3Jt6b0_V1xMbKkCJDY33J9X1E6DFDO9lziQ';

console.log('✅ Supabase configuré avec succès');

// Créer le client Supabase avec AsyncStorage pour la persistance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour la base de données
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string;
          updated_at?: string;
        };
      };
      albums: {
        Row: {
          id: string;
          name: string;
          description?: string;
          cover_image?: string;
          owner_id: string;
          group_id?: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
          views: number;
          likes: number;
        };
        Insert: {
          name: string;
          description?: string;
          cover_image?: string;
          owner_id: string;
          group_id?: string;
          is_public?: boolean;
        };
        Update: {
          name?: string;
          description?: string;
          cover_image?: string;
          is_public?: boolean;
          updated_at?: string;
          views?: number;
          likes?: number;
        };
      };
      photos: {
        Row: {
          id: string;
          uri: string;
          album_id: string;
          owner_id: string;
          metadata?: any;
          tags?: string[];
          created_at: string;
          updated_at: string;
          likes: number;
        };
        Insert: {
          uri: string;
          album_id: string;
          owner_id: string;
          metadata?: any;
          tags?: string[];
        };
        Update: {
          metadata?: any;
          tags?: string[];
          updated_at?: string;
          likes?: number;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description?: string;
          cover_image?: string;
          owner_id: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string;
          cover_image?: string;
          owner_id: string;
          invite_code: string;
        };
        Update: {
          name?: string;
          description?: string;
          cover_image?: string;
          updated_at?: string;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
        };
        Update: {
          role?: 'owner' | 'admin' | 'member';
        };
      };
      comments: {
        Row: {
          id: string;
          text: string;
          author_id: string;
          photo_id?: string;
          album_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          text: string;
          author_id: string;
          photo_id?: string;
          album_id?: string;
        };
        Update: {
          text?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          photo_id?: string;
          album_id?: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          photo_id?: string;
          album_id?: string;
        };
        Update: never;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];