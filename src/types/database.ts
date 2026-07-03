// Tipos escritos à mão a partir de supabase/migrations.
// Quando o MCP do Supabase estiver conectado, regerar o canônico com:
//   generate_typescript_types (MCP)  ou
//   npx supabase gen types typescript --project-id wqnsdhqqbxhdjwnhdeej > src/types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled'

export type MatchStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          external_id: string | null
          name: string
          code: string
          flag_url: string | null
          crest_url: string | null
          group_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          name: string
          code: string
          flag_url?: string | null
          crest_url?: string | null
          group_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          external_id?: string | null
          name?: string
          code?: string
          flag_url?: string | null
          crest_url?: string | null
          group_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          external_id: string
          home_team_id: string
          away_team_id: string
          kickoff_at: string
          stage: MatchStage
          group_name: string | null
          venue: string | null
          home_score: number | null
          away_score: number | null
          status: MatchStatus
          finished_at: string | null
          score_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          home_team_id: string
          away_team_id: string
          kickoff_at: string
          stage: MatchStage
          group_name?: string | null
          venue?: string | null
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          finished_at?: string | null
          score_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          home_team_id?: string
          away_team_id?: string
          kickoff_at?: string
          stage?: MatchStage
          group_name?: string | null
          venue?: string | null
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          finished_at?: string | null
          score_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'matches_home_team_id_fkey'
            columns: ['home_team_id']
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'matches_away_team_id_fkey'
            columns: ['away_team_id']
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      pools: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pools_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pool_members: {
        Row: {
          pool_id: string
          user_id: string
          joined_at: string
          blocked: boolean
          hidden: boolean
        }
        Insert: {
          pool_id: string
          user_id: string
          joined_at?: string
          blocked?: boolean
          hidden?: boolean
        }
        Update: {
          pool_id?: string
          user_id?: string
          joined_at?: string
          blocked?: boolean
          hidden?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'pool_members_pool_id_fkey'
            columns: ['pool_id']
            referencedRelation: 'pools'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pool_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      scoring_rules: {
        Row: {
          pool_id: string
          exact_score_points: number
          winner_with_winner_goals_points: number
          winner_with_diff_points: number
          winner_with_loser_goals_points: number
          winner_only_points: number
          draw_wrong_score_points: number
          group_multiplier: number
          knockout_multiplier: number
          quarter_multiplier: number
          semi_multiplier: number
          final_multiplier: number
        }
        Insert: {
          pool_id: string
          exact_score_points?: number
          winner_with_winner_goals_points?: number
          winner_with_diff_points?: number
          winner_with_loser_goals_points?: number
          winner_only_points?: number
          draw_wrong_score_points?: number
          group_multiplier?: number
          knockout_multiplier?: number
          quarter_multiplier?: number
          semi_multiplier?: number
          final_multiplier?: number
        }
        Update: {
          pool_id?: string
          exact_score_points?: number
          winner_with_winner_goals_points?: number
          winner_with_diff_points?: number
          winner_with_loser_goals_points?: number
          winner_only_points?: number
          draw_wrong_score_points?: number
          group_multiplier?: number
          knockout_multiplier?: number
          quarter_multiplier?: number
          semi_multiplier?: number
          final_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: 'scoring_rules_pool_id_fkey'
            columns: ['pool_id']
            referencedRelation: 'pools'
            referencedColumns: ['id']
          },
        ]
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          pool_id: string
          home_score: number
          away_score: number
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          pool_id: string
          home_score: number
          away_score: number
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          pool_id?: string
          home_score?: number
          away_score?: number
          points?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'predictions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_pool_id_fkey'
            columns: ['pool_id']
            referencedRelation: 'pools'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          match_id: string | null
          pool_id: string | null
          read_at: string | null
          dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          match_id?: string | null
          pool_id?: string | null
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          match_id?: string | null
          pool_id?: string | null
          read_at?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_pool_id_fkey'
            columns: ['pool_id']
            referencedRelation: 'pools'
            referencedColumns: ['id']
          },
        ]
      }
      palpite_reactions: {
        Row: {
          id: string
          match_id: string
          target_user_id: string
          reactor_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          target_user_id: string
          reactor_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          target_user_id?: string
          reactor_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'palpite_reactions_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          user_id: string | null
          pool_id: string | null
          amount: number
          status: string
          external_id: string | null
          mov_id: string | null
          pix_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          pool_id?: string | null
          amount: number
          status?: string
          external_id?: string | null
          mov_id?: string | null
          pix_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          pool_id?: string | null
          amount?: number
          status?: string
          external_id?: string | null
          mov_id?: string | null
          pix_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          id: string
          provider: string
          external_id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider?: string
          external_id: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          external_id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          id: string
          user_id: string
          pool_id: string | null
          full_name: string
          signature: string
          contract_text: string
          contract_version: string
          signed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pool_id?: string | null
          full_name: string
          signature: string
          contract_text: string
          contract_version?: string
          signed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pool_id?: string | null
          full_name?: string
          signature?: string
          contract_text?: string
          contract_version?: string
          signed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contract_signatures_pool_id_fkey'
            columns: ['pool_id']
            referencedRelation: 'pools'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      pool_rankings: {
        Row: {
          pool_id: string
          user_id: string
          display_name: string | null
          username: string
          avatar_url: string | null
          total_points: number
          predictions_made: number
          exact_scores: number
        }
        Relationships: []
      }
      pool_knockout_rankings: {
        Row: {
          pool_id: string
          user_id: string
          display_name: string | null
          username: string
          avatar_url: string | null
          total_points: number
          predictions_made: number
          exact_scores: number
        }
        Relationships: []
      }
      pool_stage_rankings: {
        Row: {
          pool_id: string
          user_id: string
          display_name: string | null
          username: string
          avatar_url: string | null
          stage: MatchStage
          total_points: number
          predictions_made: number
          exact_scores: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_pool_member: {
        Args: { p_pool_id: string }
        Returns: boolean
      }
      match_predictions: {
        Args: { p_match_id: string }
        Returns: {
          user_id: string
          display_name: string | null
          username: string
          avatar_url: string | null
          home_score: number | null
          away_score: number | null
          points: number | null
          has_started: boolean
          is_me: boolean
        }[]
      }
    }
    Enums: {
      match_status: MatchStatus
      match_stage: MatchStage
    }
    CompositeTypes: Record<string, never>
  }
}

// Atalhos úteis
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']
