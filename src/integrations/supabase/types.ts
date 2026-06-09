export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string
          icon: string
          sort_order: number
          tier: string
          title: string
        }
        Insert: {
          code: string
          description: string
          icon?: string
          sort_order?: number
          tier?: string
          title: string
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          sort_order?: number
          tier?: string
          title?: string
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          ad_id: string
          context_city: string | null
          context_listing_id: string | null
          context_zip: string | null
          created_at: string
          event_type: string
          id: string
        }
        Insert: {
          ad_id: string
          context_city?: string | null
          context_listing_id?: string | null
          context_zip?: string | null
          created_at?: string
          event_type: string
          id?: string
        }
        Update: {
          ad_id?: string
          context_city?: string | null
          context_listing_id?: string | null
          context_zip?: string | null
          created_at?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_orders: {
        Row: {
          ad_slot_id: string
          amount_cents: number
          created_at: string
          currency: string
          duration_days: number
          environment: string
          id: string
          paid_at: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_slot_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          duration_days: number
          environment?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_slot_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          duration_days?: number
          environment?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_slots: {
        Row: {
          active: boolean
          advertiser_user_id: string | null
          click_url: string
          clicks_count: number
          created_at: string
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          impressions_count: number
          moderation_status: string
          paid_until: string | null
          placement: string
          priority: number
          rejection_reason: string | null
          sponsor_name: string | null
          starts_at: string
          subtitle: string | null
          target_cities: string[] | null
          target_kind: string | null
          target_zips: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          advertiser_user_id?: string | null
          click_url: string
          clicks_count?: number
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions_count?: number
          moderation_status?: string
          paid_until?: string | null
          placement?: string
          priority?: number
          rejection_reason?: string | null
          sponsor_name?: string | null
          starts_at?: string
          subtitle?: string | null
          target_cities?: string[] | null
          target_kind?: string | null
          target_zips?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          advertiser_user_id?: string | null
          click_url?: string
          clicks_count?: number
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions_count?: number
          moderation_status?: string
          paid_until?: string | null
          placement?: string
          priority?: number
          rejection_reason?: string | null
          sponsor_name?: string | null
          starts_at?: string
          subtitle?: string | null
          target_cities?: string[] | null
          target_kind?: string | null
          target_zips?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      advisor_directory: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          firm: string | null
          id: string
          immobilien_focus: boolean
          name: string
          partner_status: string | null
          phone: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm?: string | null
          id?: string
          immobilien_focus?: boolean
          name: string
          partner_status?: string | null
          phone?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm?: string | null
          id?: string
          immobilien_focus?: boolean
          name?: string
          partner_status?: string | null
          phone?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      advisor_links: {
        Row: {
          access_count: number
          advisor_email: string | null
          advisor_name: string
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          revoked: boolean
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number
          advisor_email?: string | null
          advisor_name: string
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          revoked?: boolean
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number
          advisor_email?: string | null
          advisor_name?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          revoked?: boolean
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          created_at: string
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_votes: {
        Row: {
          application_id: string
          comment: string | null
          created_at: string
          id: string
          member_link_id: string
          vote: string
        }
        Insert: {
          application_id: string
          comment?: string | null
          created_at?: string
          id?: string
          member_link_id: string
          vote: string
        }
        Update: {
          application_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          member_link_id?: string
          vote?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          ai_concerns: string[] | null
          ai_score: number | null
          ai_scored_at: string | null
          ai_strengths: string[] | null
          ai_summary: string | null
          bonitaet_check_id: string | null
          cover_message: string | null
          created_at: string
          id: string
          listing_id: string
          owner_seen_at: string | null
          owner_user_id: string
          seeker_user_id: string
          snapshot_profile: Json
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          ai_concerns?: string[] | null
          ai_score?: number | null
          ai_scored_at?: string | null
          ai_strengths?: string[] | null
          ai_summary?: string | null
          bonitaet_check_id?: string | null
          cover_message?: string | null
          created_at?: string
          id?: string
          listing_id: string
          owner_seen_at?: string | null
          owner_user_id: string
          seeker_user_id: string
          snapshot_profile?: Json
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          ai_concerns?: string[] | null
          ai_score?: number | null
          ai_scored_at?: string | null
          ai_strengths?: string[] | null
          ai_summary?: string | null
          bonitaet_check_id?: string | null
          cover_message?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          owner_seen_at?: string | null
          owner_user_id?: string
          seeker_user_id?: string
          snapshot_profile?: Json
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          balance_cents: number | null
          balance_updated_at: string | null
          connection_id: string
          created_at: string
          currency: string | null
          external_id: string
          iban: string | null
          id: string
          owner_name: string | null
          property_id: string | null
          user_id: string
        }
        Insert: {
          balance_cents?: number | null
          balance_updated_at?: string | null
          connection_id: string
          created_at?: string
          currency?: string | null
          external_id: string
          iban?: string | null
          id?: string
          owner_name?: string | null
          property_id?: string | null
          user_id: string
        }
        Update: {
          balance_cents?: number | null
          balance_updated_at?: string | null
          connection_id?: string
          created_at?: string
          currency?: string | null
          external_id?: string
          iban?: string | null
          id?: string
          owner_name?: string | null
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          institution_name: string | null
          last_sync_at: string | null
          provider: string
          requisition_id: string
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          institution_name?: string | null
          last_sync_at?: string | null
          provider?: string
          requisition_id: string
          status?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          institution_name?: string | null
          last_sync_at?: string | null
          provider?: string
          requisition_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      bank_rules: {
        Row: {
          auto_book: boolean
          created_at: string
          description: string | null
          expense_category:
            | Database["public"]["Enums"]["expense_category"]
            | null
          expense_classification:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          hit_count: number
          id: string
          last_hit_at: string | null
          match_kind: string
          match_value: string
          nka_eligible: boolean
          property_id: string | null
          target_kind: string
          unit_id: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          auto_book?: boolean
          created_at?: string
          description?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category"]
            | null
          expense_classification?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          match_kind: string
          match_value: string
          nka_eligible?: boolean
          property_id?: string | null
          target_kind?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          auto_book?: boolean
          created_at?: string
          description?: string | null
          expense_category?:
            | Database["public"]["Enums"]["expense_category"]
            | null
          expense_classification?:
            | Database["public"]["Enums"]["expense_classification"]
            | null
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          match_kind?: string
          match_value?: string
          nka_eligible?: boolean
          property_id?: string | null
          target_kind?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string
          amount_cents: number
          booking_date: string
          category: string | null
          counterparty_iban: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          external_id: string
          id: string
          match_confidence: number | null
          match_status: string
          matched_expense_id: string | null
          matched_property_id: string | null
          matched_tenant_id: string | null
          purpose: string | null
          raw: Json | null
          user_id: string
          value_date: string | null
        }
        Insert: {
          account_id: string
          amount_cents: number
          booking_date: string
          category?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          external_id: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          matched_expense_id?: string | null
          matched_property_id?: string | null
          matched_tenant_id?: string | null
          purpose?: string | null
          raw?: Json | null
          user_id: string
          value_date?: string | null
        }
        Update: {
          account_id?: string
          amount_cents?: number
          booking_date?: string
          category?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          match_confidence?: number | null
          match_status?: string
          matched_expense_id?: string | null
          matched_property_id?: string | null
          matched_tenant_id?: string | null
          purpose?: string | null
          raw?: Json | null
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_expense_id_fkey"
            columns: ["matched_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_property_id_fkey"
            columns: ["matched_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_tenant_id_fkey"
            columns: ["matched_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bonitaets_checks: {
        Row: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          owner_user_id: string | null
          paid_amount: number | null
          provider: string
          rating: string | null
          report_path: string | null
          requested_at: string
          score: number | null
          seeker_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string | null
          paid_amount?: number | null
          provider?: string
          rating?: string | null
          report_path?: string | null
          requested_at?: string
          score?: number | null
          seeker_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string | null
          paid_amount?: number | null
          provider?: string
          rating?: string | null
          report_path?: string | null
          requested_at?: string
          score?: number | null
          seeker_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          budget_estimate: number | null
          category: Database["public"]["Enums"]["provider_category"]
          commission_amount: number | null
          commission_rate: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          final_amount: number | null
          id: string
          property_id: string | null
          provider_id: string | null
          quoted_amount: number | null
          rating: number | null
          review: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          title: string
          updated_at: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          budget_estimate?: number | null
          category: Database["public"]["Enums"]["provider_category"]
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          final_amount?: number | null
          id?: string
          property_id?: string | null
          provider_id?: string | null
          quoted_amount?: number | null
          rating?: number | null
          review?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          title: string
          updated_at?: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          budget_estimate?: number | null
          category?: Database["public"]["Enums"]["provider_category"]
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          final_amount?: number | null
          id?: string
          property_id?: string | null
          provider_id?: string | null
          quoted_amount?: number | null
          rating?: number | null
          review?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          title?: string
          updated_at?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      community_wins: {
        Row: {
          amount_eur: number | null
          city: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["win_kind"]
          message: string | null
          reactions_count: number
          user_id: string
          zip_prefix: string | null
        }
        Insert: {
          amount_eur?: number | null
          city?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["win_kind"]
          message?: string | null
          reactions_count?: number
          user_id: string
          zip_prefix?: string | null
        }
        Update: {
          amount_eur?: number | null
          city?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["win_kind"]
          message?: string | null
          reactions_count?: number
          user_id?: string
          zip_prefix?: string | null
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          charges_enabled: boolean | null
          country: string | null
          created_at: string
          details_submitted: boolean | null
          id: string
          payouts_enabled: boolean | null
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          format: string | null
          id: string
          is_free: boolean
          sort_order: number
          source: string | null
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          is_free?: boolean
          sort_order?: number
          source?: string | null
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          format?: string | null
          id?: string
          is_free?: boolean
          sort_order?: number
          source?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          classification: Database["public"]["Enums"]["expense_classification"]
          contractor: string | null
          created_at: string
          description: string | null
          id: string
          nka_distribution_key: string | null
          nka_eligible: boolean
          nka_period_id: string | null
          property_id: string | null
          receipt_path: string | null
          spent_on: string
          tenant_id: string | null
          type: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          classification?: Database["public"]["Enums"]["expense_classification"]
          contractor?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nka_distribution_key?: string | null
          nka_eligible?: boolean
          nka_period_id?: string | null
          property_id?: string | null
          receipt_path?: string | null
          spent_on: string
          tenant_id?: string | null
          type?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          classification?: Database["public"]["Enums"]["expense_classification"]
          contractor?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nka_distribution_key?: string | null
          nka_eligible?: boolean
          nka_period_id?: string | null
          property_id?: string | null
          receipt_path?: string | null
          spent_on?: string
          tenant_id?: string | null
          type?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      financings: {
        Row: {
          amortization_rate: number | null
          bank_name: string
          created_at: string
          current_balance: number | null
          fixed_until: string | null
          id: string
          interest_rate: number
          loan_amount: number
          monthly_rate: number | null
          notes: string | null
          property_id: string | null
          special_repayment_allowed: number | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amortization_rate?: number | null
          bank_name: string
          created_at?: string
          current_balance?: number | null
          fixed_until?: string | null
          id?: string
          interest_rate: number
          loan_amount: number
          monthly_rate?: number | null
          notes?: string | null
          property_id?: string | null
          special_repayment_allowed?: number | null
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amortization_rate?: number | null
          bank_name?: string
          created_at?: string
          current_balance?: number | null
          fixed_until?: string | null
          id?: string
          interest_rate?: number
          loan_amount?: number
          monthly_rate?: number | null
          notes?: string | null
          property_id?: string | null
          special_repayment_allowed?: number | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          ai_amount: number | null
          ai_category: string | null
          ai_confidence: number | null
          ai_contract_end: string | null
          ai_due_date: string | null
          ai_processed_at: string | null
          ai_sender: string | null
          ai_summary: string | null
          attachments: Json | null
          body_text: string | null
          created_at: string
          from_email: string | null
          from_name: string | null
          id: string
          property_id: string | null
          raw: Json | null
          received_at: string
          source: string
          status: string
          subject: string | null
          task_id: string | null
          updated_at: string
          user_id: string
          vault_item_id: string | null
        }
        Insert: {
          ai_amount?: number | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_contract_end?: string | null
          ai_due_date?: string | null
          ai_processed_at?: string | null
          ai_sender?: string | null
          ai_summary?: string | null
          attachments?: Json | null
          body_text?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          property_id?: string | null
          raw?: Json | null
          received_at?: string
          source?: string
          status?: string
          subject?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
          vault_item_id?: string | null
        }
        Update: {
          ai_amount?: number | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_contract_end?: string | null
          ai_due_date?: string | null
          ai_processed_at?: string | null
          ai_sender?: string | null
          ai_summary?: string | null
          attachments?: Json | null
          body_text?: string | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          property_id?: string | null
          raw?: Json | null
          received_at?: string
          source?: string
          status?: string
          subject?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
          vault_item_id?: string | null
        }
        Relationships: []
      }
      land_parcels: {
        Row: {
          area_sqm: number | null
          bodenrichtwert_eur_sqm: number | null
          city: string | null
          created_at: string
          flur: string | null
          flurstueck: string | null
          gemarkung: string | null
          id: string
          lat: number | null
          lease_annual_eur: number | null
          lease_end_date: string | null
          lease_holder: string | null
          lease_type: Database["public"]["Enums"]["lease_type"]
          lng: number | null
          name: string
          notes: string | null
          org_unit_id: string | null
          parcel_type: Database["public"]["Enums"]["parcel_type"]
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          area_sqm?: number | null
          bodenrichtwert_eur_sqm?: number | null
          city?: string | null
          created_at?: string
          flur?: string | null
          flurstueck?: string | null
          gemarkung?: string | null
          id?: string
          lat?: number | null
          lease_annual_eur?: number | null
          lease_end_date?: string | null
          lease_holder?: string | null
          lease_type?: Database["public"]["Enums"]["lease_type"]
          lng?: number | null
          name: string
          notes?: string | null
          org_unit_id?: string | null
          parcel_type?: Database["public"]["Enums"]["parcel_type"]
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          area_sqm?: number | null
          bodenrichtwert_eur_sqm?: number | null
          city?: string | null
          created_at?: string
          flur?: string | null
          flurstueck?: string | null
          gemarkung?: string | null
          id?: string
          lat?: number | null
          lease_annual_eur?: number | null
          lease_end_date?: string | null
          lease_holder?: string | null
          lease_type?: Database["public"]["Enums"]["lease_type"]
          lng?: number | null
          name?: string
          notes?: string | null
          org_unit_id?: string | null
          parcel_type?: Database["public"]["Enums"]["parcel_type"]
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      legal_sources: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          last_checked_at: string | null
          last_hash: string | null
          paragraph: string
          title: string
          url: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_hash?: string | null
          paragraph: string
          title: string
          url: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_hash?: string | null
          paragraph?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      legal_updates: {
        Row: {
          detected_at: string
          id: string
          impact: string | null
          new_hash: string
          prev_hash: string | null
          source_id: string
          summary: string
        }
        Insert: {
          detected_at?: string
          id?: string
          impact?: string | null
          new_hash: string
          prev_hash?: string | null
          source_id: string
          summary: string
        }
        Update: {
          detected_at?: string
          id?: string
          impact?: string | null
          new_hash?: string
          prev_hash?: string | null
          source_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_updates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_alerts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          last_notified_at: string | null
          max_price: number | null
          min_rooms: number | null
          min_space: number | null
          user_id: string
          zips: string[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          last_notified_at?: string | null
          max_price?: number | null
          min_rooms?: number | null
          min_space?: number | null
          user_id: string
          zips?: string[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          last_notified_at?: string | null
          max_price?: number | null
          min_rooms?: number | null
          min_space?: number | null
          user_id?: string
          zips?: string[] | null
        }
        Relationships: []
      }
      listing_messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_user_id: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_saves: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          ai_description: string | null
          ai_generated_at: string | null
          ai_suggested_rent: number | null
          applications_count: number
          available_from: string | null
          city: string | null
          created_at: string
          deposit: number | null
          description: string | null
          energy_class: string | null
          energy_value: number | null
          expires_at: string | null
          features: Json
          id: string
          kind: Database["public"]["Enums"]["listing_kind"]
          lat: number | null
          living_space: number | null
          lng: number | null
          min_term_months: number | null
          photos: string[]
          price: number
          property_id: string | null
          published_at: string | null
          rooms: number | null
          status: Database["public"]["Enums"]["listing_status"]
          street_public: string | null
          students_welcome: boolean | null
          title: string
          unit_id: string | null
          updated_at: string
          user_id: string
          utilities: number | null
          views_count: number
          wg_current_flatmates: number | null
          wg_flatmate_age_max: number | null
          wg_flatmate_age_min: number | null
          wg_flatmate_gender_pref: string | null
          wg_furnished: boolean | null
          wg_room_size_sqm: number | null
          wg_shared_facilities: Json | null
          wg_total_rooms: number | null
          zip: string | null
        }
        Insert: {
          ai_description?: string | null
          ai_generated_at?: string | null
          ai_suggested_rent?: number | null
          applications_count?: number
          available_from?: string | null
          city?: string | null
          created_at?: string
          deposit?: number | null
          description?: string | null
          energy_class?: string | null
          energy_value?: number | null
          expires_at?: string | null
          features?: Json
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          lat?: number | null
          living_space?: number | null
          lng?: number | null
          min_term_months?: number | null
          photos?: string[]
          price?: number
          property_id?: string | null
          published_at?: string | null
          rooms?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          street_public?: string | null
          students_welcome?: boolean | null
          title: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
          utilities?: number | null
          views_count?: number
          wg_current_flatmates?: number | null
          wg_flatmate_age_max?: number | null
          wg_flatmate_age_min?: number | null
          wg_flatmate_gender_pref?: string | null
          wg_furnished?: boolean | null
          wg_room_size_sqm?: number | null
          wg_shared_facilities?: Json | null
          wg_total_rooms?: number | null
          zip?: string | null
        }
        Update: {
          ai_description?: string | null
          ai_generated_at?: string | null
          ai_suggested_rent?: number | null
          applications_count?: number
          available_from?: string | null
          city?: string | null
          created_at?: string
          deposit?: number | null
          description?: string | null
          energy_class?: string | null
          energy_value?: number | null
          expires_at?: string | null
          features?: Json
          id?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          lat?: number | null
          living_space?: number | null
          lng?: number | null
          min_term_months?: number | null
          photos?: string[]
          price?: number
          property_id?: string | null
          published_at?: string | null
          rooms?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          street_public?: string | null
          students_welcome?: boolean | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          utilities?: number | null
          views_count?: number
          wg_current_flatmates?: number | null
          wg_flatmate_age_max?: number | null
          wg_flatmate_age_min?: number | null
          wg_flatmate_gender_pref?: string | null
          wg_furnished?: boolean | null
          wg_room_size_sqm?: number | null
          wg_shared_facilities?: Json | null
          wg_total_rooms?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      market_index: {
        Row: {
          avg_purchase_sqm: number
          avg_rent_sqm: number
          avg_utilities_sqm: number | null
          city: string | null
          id: string
          sample_size: number | null
          updated_at: string
          vacancy_rate: number | null
          yield_factor: number
          zip: string
        }
        Insert: {
          avg_purchase_sqm: number
          avg_rent_sqm: number
          avg_utilities_sqm?: number | null
          city?: string | null
          id?: string
          sample_size?: number | null
          updated_at?: string
          vacancy_rate?: number | null
          yield_factor: number
          zip: string
        }
        Update: {
          avg_purchase_sqm?: number
          avg_rent_sqm?: number
          avg_utilities_sqm?: number | null
          city?: string | null
          id?: string
          sample_size?: number | null
          updated_at?: string
          vacancy_rate?: number | null
          yield_factor?: number
          zip?: string
        }
        Relationships: []
      }
      market_pulse: {
        Row: {
          caption: string | null
          city: string | null
          created_at: string
          delta_pct: number | null
          id: string
          metric: string
          value: number
          week_start: string
          zip_prefix: string | null
        }
        Insert: {
          caption?: string | null
          city?: string | null
          created_at?: string
          delta_pct?: number | null
          id?: string
          metric: string
          value: number
          week_start: string
          zip_prefix?: string | null
        }
        Update: {
          caption?: string | null
          city?: string | null
          created_at?: string
          delta_pct?: number | null
          id?: string
          metric?: string
          value?: number
          week_start?: string
          zip_prefix?: string | null
        }
        Relationships: []
      }
      nka_cost_categories: {
        Row: {
          betrkv_ref: string | null
          code: string
          default_distribution_key: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          betrkv_ref?: string | null
          code: string
          default_distribution_key?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          betrkv_ref?: string | null
          code?: string
          default_distribution_key?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      nka_cost_items: {
        Row: {
          amount: number
          category_code: string
          created_at: string
          distribution_key: string
          id: string
          label: string | null
          period_id: string
          source_expense_id: string | null
          umlagefaehig: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category_code: string
          created_at?: string
          distribution_key?: string
          id?: string
          label?: string | null
          period_id: string
          source_expense_id?: string | null
          umlagefaehig?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_code?: string
          created_at?: string
          distribution_key?: string
          id?: string
          label?: string | null
          period_id?: string
          source_expense_id?: string | null
          umlagefaehig?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nka_cost_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "nka_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      nka_distributions: {
        Row: {
          breakdown: Json | null
          created_at: string
          id: string
          ist_summe: number
          payment_id: string | null
          pdf_path: string | null
          period_id: string
          saldo: number
          sent_at: string | null
          tenant_id: string
          unit_id: string
          updated_at: string
          user_id: string
          vorauszahlung_summe: number
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          id?: string
          ist_summe?: number
          payment_id?: string | null
          pdf_path?: string | null
          period_id: string
          saldo?: number
          sent_at?: string | null
          tenant_id: string
          unit_id: string
          updated_at?: string
          user_id: string
          vorauszahlung_summe?: number
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          id?: string
          ist_summe?: number
          payment_id?: string | null
          pdf_path?: string | null
          period_id?: string
          saldo?: number
          sent_at?: string | null
          tenant_id?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
          vorauszahlung_summe?: number
        }
        Relationships: [
          {
            foreignKeyName: "nka_distributions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "nka_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      nka_periods: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          property_id: string
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          property_id: string
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          property_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          email_ad_moderation: boolean
          email_application_status: boolean
          email_invoice: boolean
          email_new_application: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_ad_moderation?: boolean
          email_application_status?: boolean
          email_invoice?: boolean
          email_new_application?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_ad_moderation?: boolean
          email_application_status?: boolean
          email_invoice?: boolean
          email_new_application?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      org_units: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["org_level"]
          name: string
          notes: string | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["org_level"]
          name: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["org_level"]
          name?: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          month: string | null
          note: string | null
          notes: string | null
          paid_on: string
          property_id: string | null
          status: Database["public"]["Enums"]["payment_status_simple"] | null
          tenant_id: string | null
          type: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          month?: string | null
          note?: string | null
          notes?: string | null
          paid_on: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["payment_status_simple"] | null
          tenant_id?: string | null
          type?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          month?: string | null
          note?: string | null
          notes?: string | null
          paid_on?: string
          property_id?: string | null
          status?: Database["public"]["Enums"]["payment_status_simple"] | null
          tenant_id?: string | null
          type?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      places_cache: {
        Row: {
          category: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          radius_km: number
          zip: string
        }
        Insert: {
          category: string
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          radius_km: number
          zip: string
        }
        Update: {
          category?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          radius_km?: number
          zip?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          inbox_alias: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          inbox_alias?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          inbox_alias?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          afa_rate: number | null
          area_sqm: number | null
          build_year: number | null
          city: string | null
          cold_rent: number | null
          created_at: string
          denkmalschutz: boolean
          deposit: number | null
          erbpacht_ende: string | null
          erbpacht_zins_jaehrlich: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          org_unit_id: string | null
          purchase_date: string | null
          purchase_price: number | null
          rooms: number | null
          sonderafa_7b: boolean
          status: string
          street: string | null
          updated_at: string
          user_id: string
          utilities: number | null
          zip: string | null
        }
        Insert: {
          afa_rate?: number | null
          area_sqm?: number | null
          build_year?: number | null
          city?: string | null
          cold_rent?: number | null
          created_at?: string
          denkmalschutz?: boolean
          deposit?: number | null
          erbpacht_ende?: string | null
          erbpacht_zins_jaehrlich?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          org_unit_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          rooms?: number | null
          sonderafa_7b?: boolean
          status?: string
          street?: string | null
          updated_at?: string
          user_id: string
          utilities?: number | null
          zip?: string | null
        }
        Update: {
          afa_rate?: number | null
          area_sqm?: number | null
          build_year?: number | null
          city?: string | null
          cold_rent?: number | null
          created_at?: string
          denkmalschutz?: boolean
          deposit?: number | null
          erbpacht_ende?: string | null
          erbpacht_zins_jaehrlich?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          org_unit_id?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          rooms?: number | null
          sonderafa_7b?: boolean
          status?: string
          street?: string | null
          updated_at?: string
          user_id?: string
          utilities?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          category: Database["public"]["Enums"]["provider_category"]
          city: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          premium: boolean | null
          rating: number | null
          response_time_hours: number | null
          reviews_count: number | null
          verified: boolean | null
          website: string | null
          zip: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["provider_category"]
          city?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          premium?: boolean | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          verified?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["provider_category"]
          city?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          premium?: boolean | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          verified?: boolean | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      quests: {
        Row: {
          active: boolean
          code: string
          description: string
          metric: string
          reward_points: number
          sort_order: number
          target: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          description: string
          metric: string
          reward_points?: number
          sort_order?: number
          target?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          description?: string
          metric?: string
          reward_points?: number
          sort_order?: number
          target?: number
          title?: string
        }
        Relationships: []
      }
      seeker_profiles: {
        Row: {
          about_me: string | null
          bafoeg_amount: number | null
          completeness_score: number
          created_at: string
          employer: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          full_name: string | null
          guarantor_document_path: string | null
          guarantor_income: number | null
          guarantor_name: string | null
          guarantor_relation: string | null
          has_pets: boolean | null
          household_size: number | null
          id: string
          is_student: boolean | null
          max_rent: number | null
          move_in_from: string | null
          net_income_monthly: number | null
          phone: string | null
          preferred_zips: string[] | null
          profile_photo: string | null
          schufa_status: Database["public"]["Enums"]["schufa_status"]
          smoker: boolean | null
          study_certificate_path: string | null
          study_program: string | null
          study_semester: number | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about_me?: string | null
          bafoeg_amount?: number | null
          completeness_score?: number
          created_at?: string
          employer?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          full_name?: string | null
          guarantor_document_path?: string | null
          guarantor_income?: number | null
          guarantor_name?: string | null
          guarantor_relation?: string | null
          has_pets?: boolean | null
          household_size?: number | null
          id?: string
          is_student?: boolean | null
          max_rent?: number | null
          move_in_from?: string | null
          net_income_monthly?: number | null
          phone?: string | null
          preferred_zips?: string[] | null
          profile_photo?: string | null
          schufa_status?: Database["public"]["Enums"]["schufa_status"]
          smoker?: boolean | null
          study_certificate_path?: string | null
          study_program?: string | null
          study_semester?: number | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about_me?: string | null
          bafoeg_amount?: number | null
          completeness_score?: number
          created_at?: string
          employer?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          full_name?: string | null
          guarantor_document_path?: string | null
          guarantor_income?: number | null
          guarantor_name?: string | null
          guarantor_relation?: string | null
          has_pets?: boolean | null
          household_size?: number | null
          id?: string
          is_student?: boolean | null
          max_rent?: number | null
          move_in_from?: string | null
          net_income_monthly?: number | null
          phone?: string | null
          preferred_zips?: string[] | null
          profile_photo?: string | null
          schufa_status?: Database["public"]["Enums"]["schufa_status"]
          smoker?: boolean | null
          study_certificate_path?: string | null
          study_program?: string | null
          study_semester?: number | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string | null
          processed_at: string
        }
        Insert: {
          environment: string
          event_id: string
          event_type?: string | null
          processed_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string | null
          processed_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          id: string
          legal_ref: string | null
          legal_url: string | null
          property_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          legal_ref?: string | null
          legal_url?: string | null
          property_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          legal_ref?: string | null
          legal_url?: string | null
          property_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_documents: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tenant_doc_kind"]
          mime: string | null
          name: string
          notes: string | null
          path: string
          size_bytes: number | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tenant_doc_kind"]
          mime?: string | null
          name: string
          notes?: string | null
          path: string
          size_bytes?: number | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tenant_doc_kind"]
          mime?: string | null
          name?: string
          notes?: string | null
          path?: string
          size_bytes?: number | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_issue_notes: {
        Row: {
          author_email: string | null
          body: string
          created_at: string
          id: string
          issue_id: string
          user_id: string
        }
        Insert: {
          author_email?: string | null
          body: string
          created_at?: string
          id?: string
          issue_id: string
          user_id: string
        }
        Update: {
          author_email?: string | null
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_issue_notes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "tenant_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_issues: {
        Row: {
          assignee: string | null
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          reported_at: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          snooze_until: string | null
          status: Database["public"]["Enums"]["issue_status"]
          tenant_id: string
          title: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          category: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          reported_at?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          snooze_until?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          tenant_id: string
          title: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee?: string | null
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          reported_at?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          snooze_until?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          tenant_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_pass: {
        Row: {
          created_at: string
          display_name: string | null
          headline: string | null
          id: string
          is_public: boolean
          landlord_ratings: Json
          pass_code: string
          rental_history: Json
          updated_at: string
          user_id: string
          verified_income: Json
          verified_mietschuldenfrei: Json
          verified_schufa: Json
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          landlord_ratings?: Json
          pass_code?: string
          rental_history?: Json
          updated_at?: string
          user_id: string
          verified_income?: Json
          verified_mietschuldenfrei?: Json
          verified_schufa?: Json
        }
        Update: {
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          landlord_ratings?: Json
          pass_code?: string
          rental_history?: Json
          updated_at?: string
          user_id?: string
          verified_income?: Json
          verified_mietschuldenfrei?: Json
          verified_schufa?: Json
        }
        Relationships: []
      }
      tenant_payment_mandates: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          next_charge_date: string | null
          property_id: string | null
          status: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_mandate_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          next_charge_date?: string | null
          property_id?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_mandate_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          next_charge_date?: string | null
          property_id?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_mandate_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_mandates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_payment_mandates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_portal_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked: boolean
          tenant_id: string
          token: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          tenant_id: string
          token?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          tenant_id?: string
          token?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          archived_at: string | null
          created_at: string
          deposit: number | null
          email: string | null
          full_name: string
          iban: string | null
          id: string
          lease_end: string | null
          lease_start: string | null
          notes: string | null
          phone: string | null
          property_id: string | null
          since: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          full_name: string
          iban?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          since?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          full_name?: string
          iban?: string | null
          id?: string
          lease_end?: string | null
          lease_start?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          since?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          heating_share_pct: number | null
          id: string
          label: string
          living_space: number | null
          persons_count: number | null
          property_id: string
          rent_cold: number | null
          rooms: number | null
          updated_at: string
          user_id: string
          utilities: number | null
        }
        Insert: {
          created_at?: string
          heating_share_pct?: number | null
          id?: string
          label: string
          living_space?: number | null
          persons_count?: number | null
          property_id: string
          rent_cold?: number | null
          rooms?: number | null
          updated_at?: string
          user_id: string
          utilities?: number | null
        }
        Update: {
          created_at?: string
          heating_share_pct?: number | null
          id?: string
          label?: string
          living_space?: number | null
          persons_count?: number | null
          property_id?: string
          rent_cold?: number | null
          rooms?: number | null
          updated_at?: string
          user_id?: string
          utilities?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          last_active_week: string | null
          level: number
          points: number
          pseudonym: string | null
          total_wins: number
          updated_at: string
          user_id: string
          weekly_streak: number
        }
        Insert: {
          created_at?: string
          last_active_week?: string | null
          level?: number
          points?: number
          pseudonym?: string | null
          total_wins?: number
          updated_at?: string
          user_id: string
          weekly_streak?: number
        }
        Update: {
          created_at?: string
          last_active_week?: string | null
          level?: number
          points?: number
          pseudonym?: string | null
          total_wins?: number
          updated_at?: string
          user_id?: string
          weekly_streak?: number
        }
        Relationships: []
      }
      user_templates: {
        Row: {
          body_md: string
          category: string | null
          created_at: string
          id: string
          source_template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_md?: string
          category?: string | null
          created_at?: string
          id?: string
          source_template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_md?: string
          category?: string | null
          created_at?: string
          id?: string
          source_template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_documents: {
        Row: {
          category: Database["public"]["Enums"]["vault_category"]
          created_at: string
          display_name: string
          enc_iv: string
          enc_salt: string
          id: string
          mime_type: string | null
          notes: string | null
          original_name: string
          property_id: string | null
          retention_until: string | null
          scope: string
          size_bytes: number
          storage_path: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["vault_category"]
          created_at?: string
          display_name: string
          enc_iv: string
          enc_salt: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_name: string
          property_id?: string | null
          retention_until?: string | null
          scope?: string
          size_bytes?: number
          storage_path: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["vault_category"]
          created_at?: string
          display_name?: string
          enc_iv?: string
          enc_salt?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_name?: string
          property_id?: string | null
          retention_until?: string | null
          scope?: string
          size_bytes?: number
          storage_path?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_settings: {
        Row: {
          created_at: string
          pin_salt: string
          updated_at: string
          user_id: string
          verifier_ct: string
          verifier_iv: string
        }
        Insert: {
          created_at?: string
          pin_salt: string
          updated_at?: string
          user_id: string
          verifier_ct: string
          verifier_iv: string
        }
        Update: {
          created_at?: string
          pin_salt?: string
          updated_at?: string
          user_id?: string
          verifier_ct?: string
          verifier_iv?: string
        }
        Relationships: []
      }
      wg_member_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          listing_id: string
          member_email: string | null
          member_name: string
          revoked: boolean
          role: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          listing_id: string
          member_email?: string | null
          member_name: string
          revoked?: boolean
          role?: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          listing_id?: string
          member_email?: string | null
          member_name?: string
          revoked?: boolean
          role?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      win_reactions: {
        Row: {
          created_at: string
          user_id: string
          win_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          win_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          win_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "win_reactions_win_id_fkey"
            columns: ["win_id"]
            isOneToOne: false
            referencedRelation: "community_wins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ad_slots_for: {
        Args: {
          _city?: string
          _kind?: string
          _limit?: number
          _placement: string
          _zip?: string
        }
        Returns: {
          active: boolean
          advertiser_user_id: string | null
          click_url: string
          clicks_count: number
          created_at: string
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          impressions_count: number
          moderation_status: string
          paid_until: string | null
          placement: string
          priority: number
          rejection_reason: string | null
          sponsor_name: string | null
          starts_at: string
          subtitle: string | null
          target_cities: string[] | null
          target_kind: string | null
          target_zips: string[] | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ad_slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ad_track_event: {
        Args: {
          _ad_id: string
          _city?: string
          _event_type: string
          _listing_id?: string
          _zip?: string
        }
        Returns: undefined
      }
      advisor_get_data: { Args: { _token: string }; Returns: Json }
      advisor_owner_for_token: { Args: { _token: string }; Returns: string }
      advisor_touch_token: { Args: { _token: string }; Returns: string }
      avm_estimate: {
        Args: { _annual_rent: number; _living_space: number; _zip: string }
        Returns: Json
      }
      calc_landlord_score: { Args: { _user_id: string }; Returns: Json }
      can_post_wins: { Args: { _user_id: string }; Returns: boolean }
      can_view_seeker_profile: {
        Args: { _seeker: string; _viewer: string }
        Returns: boolean
      }
      check_ai_quota: {
        Args: { _function: string; _user_id: string }
        Returns: undefined
      }
      check_user_quota: {
        Args: { _resource: string; _user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_default_unit: { Args: { _property_id: string }; Returns: string }
      evaluate_achievements: { Args: never; Returns: Json }
      has_pro_access: {
        Args: { _env?: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user: string }; Returns: boolean }
      is_app_participant: {
        Args: { _app_id: string; _user: string }
        Returns: boolean
      }
      listing_inc_view: { Args: { _listing_id: string }; Returns: undefined }
      listings_nearby: {
        Args: {
          _exclude_id?: string
          _kind?: string
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          city: string
          distance_km: number
          id: string
          kind: string
          lat: number
          living_space: number
          lng: number
          photos: string[]
          price: number
          published_at: string
          rooms: number
          status: string
          title: string
          zip: string
        }[]
      }
      missing_rents: {
        Args: { _grace_day?: number }
        Returns: {
          days_overdue: number
          due_day: number
          expected_amount: number
          property_id: string
          property_name: string
          tenant_id: string
          tenant_name: string
          unit_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_get_ad_advertiser_email: {
        Args: { _ad_id: string }
        Returns: Json
      }
      notify_get_application_seeker_email: {
        Args: { _application_id: string }
        Returns: Json
      }
      notify_get_listing_owner_email: {
        Args: { _listing_id: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_user_activity: {
        Args: {
          _amount?: number
          _city?: string
          _kind: string
          _message?: string
          _zip?: string
        }
        Returns: string
      }
      recurring_transactions: {
        Args: { _months?: number }
        Returns: {
          avg_amount_cents: number
          counterparty: string
          direction: string
          last_seen: string
          occurrences: number
        }[]
      }
      tenant_portal_get_nka: { Args: { _token: string }; Returns: Json }
      tenant_portal_nka_pdf_path: {
        Args: { _distribution_id: string; _token: string }
        Returns: string
      }
      tenant_portal_report_issue: {
        Args: {
          _category: string
          _description: string
          _severity: Database["public"]["Enums"]["issue_severity"]
          _title: string
          _token: string
        }
        Returns: string
      }
      tenant_portal_resolve: { Args: { _token: string }; Returns: Json }
      trial_days_left: { Args: { _user_id: string }; Returns: number }
      user_plan_tier: { Args: { _user_id: string }; Returns: string }
      wg_casting_resolve: { Args: { _token: string }; Returns: Json }
      wg_casting_vote: {
        Args: {
          _application_id: string
          _comment?: string
          _token: string
          _vote: string
        }
        Returns: string
      }
    }
    Enums: {
      application_status:
        | "sent"
        | "shortlisted"
        | "rejected"
        | "accepted"
        | "withdrawn"
      booking_status:
        | "requested"
        | "quoted"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
      employment_type:
        | "unbefristet"
        | "befristet"
        | "selbststaendig"
        | "beamter"
        | "rentner"
        | "student"
        | "arbeitslos"
        | "sonstiges"
      expense_category:
        | "immediate"
        | "depreciable"
        | "utilities_passthrough"
        | "financing"
        | "other"
      expense_classification: "maintenance" | "production" | "anschaffungsnah"
      issue_severity: "info" | "minor" | "major" | "urgent"
      issue_status:
        | "open"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "closed"
      lease_type:
        | "eigentum"
        | "erbpacht_geber"
        | "erbpacht_nehmer"
        | "pacht"
        | "miete"
        | "sonstige"
      listing_kind: "rent" | "sale" | "wg_room"
      listing_status: "draft" | "published" | "paused" | "closed"
      org_level:
        | "bistum"
        | "landeskirche"
        | "dekanat"
        | "gemeinde"
        | "stiftung"
        | "verwaltung"
        | "sonstige"
      parcel_type:
        | "bauland"
        | "bauerwartung"
        | "acker"
        | "wald"
        | "wiese"
        | "garten"
        | "gewerbe"
        | "sonstige"
      payment_kind:
        | "rent_cold"
        | "utilities"
        | "deposit"
        | "other"
        | "nka_nachzahlung"
        | "nka_erstattung"
      payment_status_simple: "paid" | "open" | "late"
      provider_category:
        | "sanitaer"
        | "elektrik"
        | "heizung"
        | "dach"
        | "maler"
        | "garten"
        | "reinigung"
        | "schluessel"
        | "schaedling"
        | "steuerberater"
        | "jurist"
        | "energieberater"
      schufa_status: "unverified" | "self_declared" | "document_uploaded"
      tenant_doc_kind:
        | "contract"
        | "id"
        | "schufa"
        | "income"
        | "handover"
        | "other"
      vault_category:
        | "kaufvertrag"
        | "mietvertrag"
        | "nebenkostenabrechnung"
        | "versicherung"
        | "steuerbescheid"
        | "grundbuch"
        | "energieausweis"
        | "foto"
        | "rechnung"
        | "protokoll"
        | "korrespondenz"
        | "sonstiges"
        | "ausweis"
        | "fuehrerschein"
        | "gesundheit"
        | "arbeit"
        | "bank"
        | "vertrag"
        | "kfz"
        | "familie"
        | "schule"
      win_kind:
        | "tax_saved"
        | "receipts_added"
        | "nka_done"
        | "listing_published"
        | "tenant_added"
        | "milestone"
        | "tip"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "sent",
        "shortlisted",
        "rejected",
        "accepted",
        "withdrawn",
      ],
      booking_status: [
        "requested",
        "quoted",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      employment_type: [
        "unbefristet",
        "befristet",
        "selbststaendig",
        "beamter",
        "rentner",
        "student",
        "arbeitslos",
        "sonstiges",
      ],
      expense_category: [
        "immediate",
        "depreciable",
        "utilities_passthrough",
        "financing",
        "other",
      ],
      expense_classification: ["maintenance", "production", "anschaffungsnah"],
      issue_severity: ["info", "minor", "major", "urgent"],
      issue_status: [
        "open",
        "acknowledged",
        "in_progress",
        "resolved",
        "closed",
      ],
      lease_type: [
        "eigentum",
        "erbpacht_geber",
        "erbpacht_nehmer",
        "pacht",
        "miete",
        "sonstige",
      ],
      listing_kind: ["rent", "sale", "wg_room"],
      listing_status: ["draft", "published", "paused", "closed"],
      org_level: [
        "bistum",
        "landeskirche",
        "dekanat",
        "gemeinde",
        "stiftung",
        "verwaltung",
        "sonstige",
      ],
      parcel_type: [
        "bauland",
        "bauerwartung",
        "acker",
        "wald",
        "wiese",
        "garten",
        "gewerbe",
        "sonstige",
      ],
      payment_kind: [
        "rent_cold",
        "utilities",
        "deposit",
        "other",
        "nka_nachzahlung",
        "nka_erstattung",
      ],
      payment_status_simple: ["paid", "open", "late"],
      provider_category: [
        "sanitaer",
        "elektrik",
        "heizung",
        "dach",
        "maler",
        "garten",
        "reinigung",
        "schluessel",
        "schaedling",
        "steuerberater",
        "jurist",
        "energieberater",
      ],
      schufa_status: ["unverified", "self_declared", "document_uploaded"],
      tenant_doc_kind: [
        "contract",
        "id",
        "schufa",
        "income",
        "handover",
        "other",
      ],
      vault_category: [
        "kaufvertrag",
        "mietvertrag",
        "nebenkostenabrechnung",
        "versicherung",
        "steuerbescheid",
        "grundbuch",
        "energieausweis",
        "foto",
        "rechnung",
        "protokoll",
        "korrespondenz",
        "sonstiges",
        "ausweis",
        "fuehrerschein",
        "gesundheit",
        "arbeit",
        "bank",
        "vertrag",
        "kfz",
        "familie",
        "schule",
      ],
      win_kind: [
        "tax_saved",
        "receipts_added",
        "nka_done",
        "listing_published",
        "tenant_added",
        "milestone",
        "tip",
      ],
    },
  },
} as const
