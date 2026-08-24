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
      accommodations: {
        Row: {
          budget_tier: string
          cover_image_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          destination_id: string | null
          gallery_urls: string[]
          google_maps_url: string | null
          google_place_id: string | null
          has_content: boolean
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          rating: number | null
          type: string
          updated_at: string
          video_urls: string[]
        }
        Insert: {
          budget_tier?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          rating?: number | null
          type?: string
          updated_at?: string
          video_urls?: string[]
        }
        Update: {
          budget_tier?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          rating?: number | null
          type?: string
          updated_at?: string
          video_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          destination_id: string | null
          duration_hours: number | null
          extra_cost_usd: number | null
          has_content: boolean
          id: string
          is_active: boolean
          is_optional: boolean
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          extra_cost_usd?: number | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          is_optional?: boolean
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          extra_cost_usd?: number | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          is_optional?: boolean
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_locations: {
        Row: {
          activity_id: string
          created_at: string
          destination_id: string | null
          id: string
          label_ar: string | null
          label_en: string | null
          park_id: string | null
          sort_order: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          destination_id?: string | null
          id?: string
          label_ar?: string | null
          label_en?: string | null
          park_id?: string | null
          sort_order?: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          destination_id?: string | null
          id?: string
          label_ar?: string | null
          label_en?: string | null
          park_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_locations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_locations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_locations_park_id_fkey"
            columns: ["park_id"]
            isOneToOne: false
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          summary?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
        }
        Relationships: []
      }
      agreement_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          title: string
          updated_at: string
          version_label: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          title: string
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          title?: string
          updated_at?: string
          version_label?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          bucket_key: string
          request_count: number
          reset_at: string
          updated_at: string
        }
        Insert: {
          bucket_key: string
          request_count: number
          reset_at: string
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          reset_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      booking_links: {
        Row: {
          created_at: string
          created_by: string | null
          departure_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          language: string
          max_bookings: number | null
          token: string
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          departure_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          language?: string
          max_bookings?: number | null
          token?: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          departure_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          language?: string
          max_bookings?: number | null
          token?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_links_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount_usd: number
          booking_id: string
          created_at: string
          id: string
          method: string | null
          notes: string | null
          reference: string | null
          status: string
        }
        Insert: {
          amount_usd: number
          booking_id: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          status?: string
        }
        Update: {
          amount_usd?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_staff: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      booking_traveller_flights: {
        Row: {
          airline: string | null
          airport: string | null
          booking_traveller_id: string
          created_at: string
          direction: string
          flight_number: string | null
          id: string
          notes: string | null
          scheduled_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          airline?: string | null
          airport?: string | null
          booking_traveller_id: string
          created_at?: string
          direction?: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          airline?: string | null
          airport?: string | null
          booking_traveller_id?: string
          created_at?: string
          direction?: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_traveller_flights_booking_traveller_id_fkey"
            columns: ["booking_traveller_id"]
            isOneToOne: false
            referencedRelation: "booking_travellers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_travellers: {
        Row: {
          allergies: string | null
          booking_id: string
          created_at: string
          date_of_birth: string | null
          dietary_requirements: string | null
          email: string | null
          emergency_contact: string | null
          first_name: string | null
          id: string
          is_rider: boolean
          last_name: string | null
          motorbike_id: string | null
          nationality: string | null
          passport_number: string | null
          phone: string | null
          room_label: string | null
          room_type: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          booking_id: string
          created_at?: string
          date_of_birth?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          is_rider?: boolean
          last_name?: string | null
          motorbike_id?: string | null
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          room_label?: string | null
          room_type?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          booking_id?: string
          created_at?: string
          date_of_birth?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          is_rider?: boolean
          last_name?: string | null
          motorbike_id?: string | null
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          room_label?: string | null
          room_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_travellers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_travellers_motorbike_id_fkey"
            columns: ["motorbike_id"]
            isOneToOne: false
            referencedRelation: "motorbikes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string | null
          created_at: string
          departure_id: string | null
          deposit_due_usd: number
          end_date: string | null
          id: string
          number_of_travellers: number
          quote_id: string | null
          request_id: string | null
          room_type: string | null
          start_date: string | null
          status: string
          total_price_usd: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          departure_id?: string | null
          deposit_due_usd?: number
          end_date?: string | null
          id?: string
          number_of_travellers: number
          quote_id?: string | null
          request_id?: string | null
          room_type?: string | null
          start_date?: string | null
          status?: string
          total_price_usd: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          departure_id?: string | null
          deposit_due_usd?: number
          end_date?: string | null
          id?: string
          number_of_travellers?: number
          quote_id?: string | null
          request_id?: string | null
          room_type?: string | null
          start_date?: string | null
          status?: string
          total_price_usd?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          language: string
          last_name: string
          notes: string | null
          phone: string | null
          preferred_language: string
          source: string | null
          total_bookings: number
          total_spent_usd: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          language?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string
          source?: string | null
          total_bookings?: number
          total_spent_usd?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          language?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string
          source?: string | null
          total_bookings?: number
          total_spent_usd?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          created_at: string
          id: string
          request_id: string | null
          summary: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          request_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          auto_archive_days: number
          auto_archive_enabled: boolean
          auto_archive_stages: string[]
          auto_complete_on_end_date: boolean
          auto_delete_days: number
          auto_delete_enabled: boolean
          auto_expire_quotes: boolean
          balance_due_days: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          booking_prefix: string | null
          brand_name: string | null
          cancellation_0_27: string | null
          cancellation_28_41: string | null
          cancellation_42_60: string | null
          cancellation_61_plus: string | null
          company_name: string
          country: string | null
          created_at: string
          currency_primary: string | null
          currency_secondary: string | null
          default_markup_percent: number
          deposit_percent: number
          email: string | null
          id: string
          invoice_prefix: string | null
          logo_url: string | null
          operations_readiness_window_days: number
          phone: string | null
          prebooked_enabled: boolean
          proposal_expiry_warning_days: number
          quote_prefix: string | null
          request_proposal_due_hours: number
          updated_at: string
          usd_to_kes_rate: number
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          auto_archive_days?: number
          auto_archive_enabled?: boolean
          auto_archive_stages?: string[]
          auto_complete_on_end_date?: boolean
          auto_delete_days?: number
          auto_delete_enabled?: boolean
          auto_expire_quotes?: boolean
          balance_due_days?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          booking_prefix?: string | null
          brand_name?: string | null
          cancellation_0_27?: string | null
          cancellation_28_41?: string | null
          cancellation_42_60?: string | null
          cancellation_61_plus?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          currency_primary?: string | null
          currency_secondary?: string | null
          default_markup_percent?: number
          deposit_percent?: number
          email?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          operations_readiness_window_days?: number
          phone?: string | null
          prebooked_enabled?: boolean
          proposal_expiry_warning_days?: number
          quote_prefix?: string | null
          request_proposal_due_hours?: number
          updated_at?: string
          usd_to_kes_rate?: number
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          auto_archive_days?: number
          auto_archive_enabled?: boolean
          auto_archive_stages?: string[]
          auto_complete_on_end_date?: boolean
          auto_delete_days?: number
          auto_delete_enabled?: boolean
          auto_expire_quotes?: boolean
          balance_due_days?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          booking_prefix?: string | null
          brand_name?: string | null
          cancellation_0_27?: string | null
          cancellation_28_41?: string | null
          cancellation_42_60?: string | null
          cancellation_61_plus?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          currency_primary?: string | null
          currency_secondary?: string | null
          default_markup_percent?: number
          deposit_percent?: number
          email?: string | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          operations_readiness_window_days?: number
          phone?: string | null
          prebooked_enabled?: boolean
          proposal_expiry_warning_days?: number
          quote_prefix?: string | null
          request_proposal_due_hours?: number
          updated_at?: string
          usd_to_kes_rate?: number
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      corporate_enquiries: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      default_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          sort_order: number
          stage: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          sort_order?: number
          stage?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          stage?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      departure_staff_assignments: {
        Row: {
          created_at: string
          departure_id: string
          id: string
          notes: string | null
          role: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          departure_id: string
          id?: string
          notes?: string | null
          role?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          departure_id?: string
          id?: string
          notes?: string | null
          role?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departure_staff_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "tour_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      departure_vehicle_assignments: {
        Row: {
          created_at: string
          departure_id: string
          id: string
          notes: string | null
          seats_used: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          departure_id: string
          id?: string
          notes?: string | null
          seats_used?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          departure_id?: string
          id?: string
          notes?: string | null
          seats_used?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departure_vehicle_assignments_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departure_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          booked_seats: number
          created_at: string
          end_date: string
          id: string
          internal_notes: string | null
          is_active: boolean
          is_public: boolean
          kind: string
          max_seats: number
          operation_title: string | null
          price_single_usd: number | null
          price_usd: number | null
          security_deposit_usd: number
          source_quote_id: string | null
          source_quote_version_id: string | null
          start_date: string
          status: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          booked_seats?: number
          created_at?: string
          end_date: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_public?: boolean
          kind?: string
          max_seats: number
          operation_title?: string | null
          price_single_usd?: number | null
          price_usd?: number | null
          security_deposit_usd?: number
          source_quote_id?: string | null
          source_quote_version_id?: string | null
          start_date: string
          status?: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          booked_seats?: number
          created_at?: string
          end_date?: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          is_public?: boolean
          kind?: string
          max_seats?: number
          operation_title?: string | null
          price_single_usd?: number | null
          price_usd?: number | null
          security_deposit_usd?: number
          source_quote_id?: string | null
          source_quote_version_id?: string | null
          start_date?: string
          status?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departures_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_source_quote_version_id_fkey"
            columns: ["source_quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departures_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country: string
          cover_image_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          gallery_urls: string[]
          google_maps_url: string | null
          google_place_id: string | null
          has_content: boolean
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          sort_order: number
          updated_at: string
          video_urls: string[]
        }
        Insert: {
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          sort_order?: number
          updated_at?: string
          video_urls?: string[]
        }
        Update: {
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          has_content?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          sort_order?: number
          updated_at?: string
          video_urls?: string[]
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_usd: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          method: string | null
          reference: string | null
        }
        Insert: {
          amount_usd: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          method?: string | null
          reference?: string | null
        }
        Update: {
          amount_usd?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          method?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      gift_vouchers: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      hotel_pricing: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      hotel_vouchers: {
        Row: {
          accommodation_id: string | null
          booking_id: string | null
          check_in: string
          check_out: string
          confirmed_at: string | null
          created_at: string
          departure_id: string | null
          guest_names: Json
          hotel_confirmation_ref: string | null
          hotel_email: string | null
          hotel_name: string
          id: string
          internal_notes: string | null
          language: string
          meal_plan: string | null
          nights: number
          num_guests: number
          num_rooms: number
          quote_id: string | null
          room_type: string | null
          sent_at: string | null
          special_requests: string | null
          status: string
          token: string
          updated_at: string
          voucher_number: string
        }
        Insert: {
          accommodation_id?: string | null
          booking_id?: string | null
          check_in: string
          check_out: string
          confirmed_at?: string | null
          created_at?: string
          departure_id?: string | null
          guest_names?: Json
          hotel_confirmation_ref?: string | null
          hotel_email?: string | null
          hotel_name: string
          id?: string
          internal_notes?: string | null
          language?: string
          meal_plan?: string | null
          nights: number
          num_guests?: number
          num_rooms?: number
          quote_id?: string | null
          room_type?: string | null
          sent_at?: string | null
          special_requests?: string | null
          status?: string
          token?: string
          updated_at?: string
          voucher_number?: string
        }
        Update: {
          accommodation_id?: string | null
          booking_id?: string | null
          check_in?: string
          check_out?: string
          confirmed_at?: string | null
          created_at?: string
          departure_id?: string | null
          guest_names?: Json
          hotel_confirmation_ref?: string | null
          hotel_email?: string | null
          hotel_name?: string
          id?: string
          internal_notes?: string | null
          language?: string
          meal_plan?: string | null
          nights?: number
          num_guests?: number
          num_rooms?: number
          quote_id?: string | null
          room_type?: string | null
          sent_at?: string | null
          special_requests?: string | null
          status?: string
          token?: string
          updated_at?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_vouchers_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_vouchers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_vouchers_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_vouchers_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_events: {
        Row: {
          attempts: number
          channel: string
          client_id: string | null
          error_message: string | null
          external_event_id: string
          id: string
          payload: Json
          processed_at: string | null
          processing_started_at: string
          quote_id: string | null
          received_at: string
          request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          client_id?: string | null
          error_message?: string | null
          external_event_id: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_started_at?: string
          quote_id?: string | null
          received_at?: string
          request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          client_id?: string | null
          error_message?: string | null
          external_event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_started_at?: string
          quote_id?: string | null
          received_at?: string
          request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string
          id: string
          invoice_id: string
          kind: string
          quantity: number
          sort_order: number
          total_usd: number | null
          trip_service_id: string | null
          unit_price_usd: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en: string
          id?: string
          invoice_id: string
          kind?: string
          quantity?: number
          sort_order?: number
          total_usd?: number | null
          trip_service_id?: string | null
          unit_price_usd?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string
          id?: string
          invoice_id?: string
          kind?: string
          quantity?: number
          sort_order?: number
          total_usd?: number | null
          trip_service_id?: string | null
          unit_price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_trip_service_id_fkey"
            columns: ["trip_service_id"]
            isOneToOne: false
            referencedRelation: "trip_services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          issued_at: string | null
          notes: string | null
          quote_id: string | null
          status: string
          terms: string | null
          total_usd: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          booking_id?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          issued_at?: string | null
          notes?: string | null
          quote_id?: string | null
          status?: string
          terms?: string | null
          total_usd?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          booking_id?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          issued_at?: string | null
          notes?: string | null
          quote_id?: string | null
          status?: string
          terms?: string | null
          total_usd?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget_range: string | null
          created_at: string
          email: string | null
          full_name: string | null
          group_size: string | null
          id: string
          phone_number: string | null
          preferred_language: string
          source: string
          special_requests: string | null
          status: string
          tour_type: string | null
          travel_dates: string | null
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          group_size?: string | null
          id?: string
          phone_number?: string | null
          preferred_language?: string
          source?: string
          special_requests?: string | null
          status?: string
          tour_type?: string | null
          travel_dates?: string | null
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          group_size?: string | null
          id?: string
          phone_number?: string | null
          preferred_language?: string
          source?: string
          special_requests?: string | null
          status?: string
          tour_type?: string | null
          travel_dates?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      motorbikes: {
        Row: {
          color: string | null
          created_at: string
          engine_cc: number | null
          id: string
          is_active: boolean
          make: string | null
          model: string | null
          name: string
          notes: string | null
          plate_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          engine_cc?: number | null
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          engine_cc?: number | null
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          plate_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      park_fees: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      parks: {
        Row: {
          country: string
          cover_image_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          gallery_urls: string[]
          google_maps_url: string | null
          google_place_id: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          park_type: string
        }
        Insert: {
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          park_type?: string
        }
        Update: {
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          gallery_urls?: string[]
          google_maps_url?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          park_type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      proposal_templates: {
        Row: {
          cover_intro_ar: string | null
          cover_intro_en: string | null
          created_at: string
          email_message_ar: string | null
          email_message_en: string | null
          email_signature_ar: string | null
          email_signature_en: string | null
          email_subject_ar: string | null
          email_subject_en: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cover_intro_ar?: string | null
          cover_intro_en?: string | null
          created_at?: string
          email_message_ar?: string | null
          email_message_en?: string | null
          email_signature_ar?: string | null
          email_signature_en?: string | null
          email_subject_ar?: string | null
          email_subject_en?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          cover_intro_ar?: string | null
          cover_intro_en?: string | null
          created_at?: string
          email_message_ar?: string | null
          email_message_en?: string | null
          email_signature_ar?: string | null
          email_signature_en?: string | null
          email_subject_ar?: string | null
          email_subject_en?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_acceptances: {
        Row: {
          accepted_at: string
          client_email: string | null
          client_name: string
          created_at: string
          delivery_id: string | null
          id: string
          ip_address: unknown
          provisional_booking_id: string | null
          quote_id: string
          quote_version_id: string
          terms_accepted: boolean
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          client_email?: string | null
          client_name: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          ip_address?: unknown
          provisional_booking_id?: string | null
          quote_id: string
          quote_version_id: string
          terms_accepted: boolean
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          client_email?: string | null
          client_name?: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          ip_address?: unknown
          provisional_booking_id?: string | null
          quote_id?: string
          quote_version_id?: string
          terms_accepted?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_acceptances_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "quote_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptances_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_acceptances_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: true
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_day_items: {
        Row: {
          accommodation_id: string | null
          activity_id: string | null
          additional_price_usd: number | null
          client_notes: string | null
          content_snapshot: Json
          created_at: string
          end_time: string | null
          id: string
          internal_notes: string | null
          is_alternative: boolean
          item_type: string
          nights: number | null
          quote_day_id: string
          room_category: string | null
          room_id: string | null
          sort_order: number
          staff_id: string | null
          start_time: string | null
          title_snapshot: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          accommodation_id?: string | null
          activity_id?: string | null
          additional_price_usd?: number | null
          client_notes?: string | null
          content_snapshot?: Json
          created_at?: string
          end_time?: string | null
          id?: string
          internal_notes?: string | null
          is_alternative?: boolean
          item_type: string
          nights?: number | null
          quote_day_id: string
          room_category?: string | null
          room_id?: string | null
          sort_order?: number
          staff_id?: string | null
          start_time?: string | null
          title_snapshot: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          accommodation_id?: string | null
          activity_id?: string | null
          additional_price_usd?: number | null
          client_notes?: string | null
          content_snapshot?: Json
          created_at?: string
          end_time?: string | null
          id?: string
          internal_notes?: string | null
          is_alternative?: boolean
          item_type?: string
          nights?: number | null
          quote_day_id?: string
          room_category?: string | null
          room_id?: string | null
          sort_order?: number
          staff_id?: string | null
          start_time?: string | null
          title_snapshot?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_day_items_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_day_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_day_items_quote_day_id_fkey"
            columns: ["quote_day_id"]
            isOneToOne: false
            referencedRelation: "quote_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_day_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_day_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "tour_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_day_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_days: {
        Row: {
          activities: Json
          client_notes: string | null
          client_notes_ar: string | null
          created_at: string
          day_date: string | null
          day_end: number | null
          day_number: number
          day_number_end: number | null
          description_ar: string | null
          description_en: string | null
          destination_id: string | null
          destination_snapshot: Json
          distance_km: number | null
          id: string
          internal_notes: string | null
          meals: string[]
          photos: string[]
          quote_version_id: string
          road_distance_km: number | null
          sort_order: number
          title: string | null
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          activities?: Json
          client_notes?: string | null
          client_notes_ar?: string | null
          created_at?: string
          day_date?: string | null
          day_end?: number | null
          day_number: number
          day_number_end?: number | null
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          destination_snapshot?: Json
          distance_km?: number | null
          id?: string
          internal_notes?: string | null
          meals?: string[]
          photos?: string[]
          quote_version_id: string
          road_distance_km?: number | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          activities?: Json
          client_notes?: string | null
          client_notes_ar?: string | null
          created_at?: string
          day_date?: string | null
          day_end?: number | null
          day_number?: number
          day_number_end?: number | null
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          destination_snapshot?: Json
          distance_km?: number | null
          id?: string
          internal_notes?: string | null
          meals?: string[]
          photos?: string[]
          quote_version_id?: string
          road_distance_km?: number | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_days_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_days_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_deliveries: {
        Row: {
          access_token: string | null
          channel: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          first_viewed_at: string | null
          id: string
          last_viewed_at: string | null
          message: string | null
          provider_message_id: string | null
          quote_id: string
          quote_version_id: string
          recipient_email: string | null
          revoked_at: string | null
          sender_email: string | null
          sent_at: string | null
          subject: string | null
          view_count: number
        }
        Insert: {
          access_token?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          message?: string | null
          provider_message_id?: string | null
          quote_id: string
          quote_version_id: string
          recipient_email?: string | null
          revoked_at?: string | null
          sender_email?: string | null
          sent_at?: string | null
          subject?: string | null
          view_count?: number
        }
        Update: {
          access_token?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          id?: string
          last_viewed_at?: string | null
          message?: string | null
          provider_message_id?: string | null
          quote_id?: string
          quote_version_id?: string
          recipient_email?: string | null
          revoked_at?: string | null
          sender_email?: string | null
          sent_at?: string | null
          subject?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_deliveries_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_deliveries_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      quote_payments: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          payment_type: string
          quote_id: string
          received_at: string
          reference: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_type?: string
          quote_id: string
          received_at?: string
          reference?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_type?: string
          quote_id?: string
          received_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_price_lines: {
        Row: {
          allocated_people: number | null
          cost_category: string
          created_at: string
          description: string
          exchange_rate_to_usd: number
          id: string
          internal_notes: string | null
          is_client_visible: boolean
          is_manual_override: boolean
          is_optional: boolean
          markup_percent_override: number | null
          original_unit_cost_usd: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          pricing_unit: string
          quantity: number
          quote_day_id: string | null
          quote_version_id: string
          rate_card_id: string | null
          room_category: string | null
          sort_order: number
          source_currency: string
          source_unit_cost: number
          supplier_rate_id: string | null
          total_cost_usd: number
          total_selling_usd: number
          traveller_category: string | null
          unit_cost_usd: number
          updated_at: string
        }
        Insert: {
          allocated_people?: number | null
          cost_category: string
          created_at?: string
          description: string
          exchange_rate_to_usd?: number
          id?: string
          internal_notes?: string | null
          is_client_visible?: boolean
          is_manual_override?: boolean
          is_optional?: boolean
          markup_percent_override?: number | null
          original_unit_cost_usd?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          pricing_unit: string
          quantity?: number
          quote_day_id?: string | null
          quote_version_id: string
          rate_card_id?: string | null
          room_category?: string | null
          sort_order?: number
          source_currency?: string
          source_unit_cost?: number
          supplier_rate_id?: string | null
          total_cost_usd?: number
          total_selling_usd?: number
          traveller_category?: string | null
          unit_cost_usd?: number
          updated_at?: string
        }
        Update: {
          allocated_people?: number | null
          cost_category?: string
          created_at?: string
          description?: string
          exchange_rate_to_usd?: number
          id?: string
          internal_notes?: string | null
          is_client_visible?: boolean
          is_manual_override?: boolean
          is_optional?: boolean
          markup_percent_override?: number | null
          original_unit_cost_usd?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          pricing_unit?: string
          quantity?: number
          quote_day_id?: string | null
          quote_version_id?: string
          rate_card_id?: string | null
          room_category?: string | null
          sort_order?: number
          source_currency?: string
          source_unit_cost?: number
          supplier_rate_id?: string | null
          total_cost_usd?: number
          total_selling_usd?: number
          traveller_category?: string | null
          unit_cost_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_price_lines_quote_day_id_fkey"
            columns: ["quote_day_id"]
            isOneToOne: false
            referencedRelation: "quote_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_price_lines_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_price_lines_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "supplier_rate_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_price_lines_supplier_rate_id_fkey"
            columns: ["supplier_rate_id"]
            isOneToOne: false
            referencedRelation: "supplier_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_travellers: {
        Row: {
          age_band_id: string | null
          age_band_snapshot: Json
          age_on_travel_date: number | null
          allergies: string | null
          created_at: string
          dietary_requirements: string | null
          display_name: string | null
          id: string
          is_complimentary: boolean
          is_paying: boolean
          pricing_fixed_amount_usd: number | null
          quote_version_id: string
          room_category: string
          sort_order: number
          traveller_category: string
          updated_at: string
        }
        Insert: {
          age_band_id?: string | null
          age_band_snapshot?: Json
          age_on_travel_date?: number | null
          allergies?: string | null
          created_at?: string
          dietary_requirements?: string | null
          display_name?: string | null
          id?: string
          is_complimentary?: boolean
          is_paying?: boolean
          pricing_fixed_amount_usd?: number | null
          quote_version_id: string
          room_category?: string
          sort_order?: number
          traveller_category: string
          updated_at?: string
        }
        Update: {
          age_band_id?: string | null
          age_band_snapshot?: Json
          age_on_travel_date?: number | null
          allergies?: string | null
          created_at?: string
          dietary_requirements?: string | null
          display_name?: string | null
          id?: string
          is_complimentary?: boolean
          is_paying?: boolean
          pricing_fixed_amount_usd?: number | null
          quote_version_id?: string
          room_category?: string
          sort_order?: number
          traveller_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_travellers_age_band_id_fkey"
            columns: ["age_band_id"]
            isOneToOne: false
            referencedRelation: "traveller_age_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_travellers_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_versions: {
        Row: {
          accepted_at: string | null
          arrival_notes: string | null
          builder_state: Json | null
          category_markup_overrides: Json
          client_snapshot: Json
          company_snapshot: Json
          compare_group: string | null
          cost_base_usd: number | null
          created_at: string
          created_by: string | null
          currency: string
          default_markup_percent: number
          departure_notes: string | null
          discount_client_label: string | null
          discount_reason: string | null
          discount_type: string | null
          discount_value: number
          exchange_rates_snapshot: Json
          exclusions: string[] | null
          gross_margin_percent: number
          gross_margin_usd: number
          id: string
          inclusions: string[] | null
          internal_notes: string | null
          language: string
          locked_at: string | null
          policy_snapshot: Json
          preview_layout: Json
          preview_theme: string | null
          quote_id: string
          sent_at: string | null
          sharing_price_per_person_usd: number | null
          single_price_per_person_usd: number | null
          single_supplement_usd: number | null
          status: string
          title: string | null
          total_cost_usd: number
          total_selling_usd: number
          track_label: string | null
          travel_end_date: string | null
          travel_start_date: string | null
          updated_at: string
          valid_until: string | null
          version_number: number
        }
        Insert: {
          accepted_at?: string | null
          arrival_notes?: string | null
          builder_state?: Json | null
          category_markup_overrides?: Json
          client_snapshot?: Json
          company_snapshot?: Json
          compare_group?: string | null
          cost_base_usd?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_markup_percent?: number
          departure_notes?: string | null
          discount_client_label?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number
          exchange_rates_snapshot?: Json
          exclusions?: string[] | null
          gross_margin_percent?: number
          gross_margin_usd?: number
          id?: string
          inclusions?: string[] | null
          internal_notes?: string | null
          language?: string
          locked_at?: string | null
          policy_snapshot?: Json
          preview_layout?: Json
          preview_theme?: string | null
          quote_id: string
          sent_at?: string | null
          sharing_price_per_person_usd?: number | null
          single_price_per_person_usd?: number | null
          single_supplement_usd?: number | null
          status?: string
          title?: string | null
          total_cost_usd?: number
          total_selling_usd?: number
          track_label?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string
          valid_until?: string | null
          version_number: number
        }
        Update: {
          accepted_at?: string | null
          arrival_notes?: string | null
          builder_state?: Json | null
          category_markup_overrides?: Json
          client_snapshot?: Json
          company_snapshot?: Json
          compare_group?: string | null
          cost_base_usd?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          default_markup_percent?: number
          departure_notes?: string | null
          discount_client_label?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number
          exchange_rates_snapshot?: Json
          exclusions?: string[] | null
          gross_margin_percent?: number
          gross_margin_usd?: number
          id?: string
          inclusions?: string[] | null
          internal_notes?: string | null
          language?: string
          locked_at?: string | null
          policy_snapshot?: Json
          preview_layout?: Json
          preview_theme?: string | null
          quote_id?: string
          sent_at?: string | null
          sharing_price_per_person_usd?: number | null
          single_price_per_person_usd?: number | null
          single_supplement_usd?: number | null
          status?: string
          title?: string | null
          total_cost_usd?: number
          total_selling_usd?: number
          track_label?: string | null
          travel_end_date?: string | null
          travel_start_date?: string | null
          updated_at?: string
          valid_until?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_version_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          departure_id: string | null
          follow_up_outcome: string | null
          id: string
          is_template: boolean
          last_contact_at: string | null
          mode: string
          next_action: string | null
          next_action_due_at: string | null
          owner_id: string | null
          provisional_booking_id: string | null
          quote_number: string
          request_id: string | null
          status: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_version_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          departure_id?: string | null
          follow_up_outcome?: string | null
          id?: string
          is_template?: boolean
          last_contact_at?: string | null
          mode?: string
          next_action?: string | null
          next_action_due_at?: string | null
          owner_id?: string | null
          provisional_booking_id?: string | null
          quote_number?: string
          request_id?: string | null
          status?: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_version_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          departure_id?: string | null
          follow_up_outcome?: string | null
          id?: string
          is_template?: boolean
          last_contact_at?: string | null
          mode?: string
          next_action?: string | null
          next_action_due_at?: string | null
          owner_id?: string | null
          provisional_booking_id?: string | null
          quote_number?: string
          request_id?: string | null
          status?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_accepted_version_id_fkey"
            columns: ["accepted_version_id"]
            isOneToOne: false
            referencedRelation: "quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      request_flights: {
        Row: {
          airline: string | null
          airport: string | null
          created_at: string
          direction: string
          flight_number: string | null
          id: string
          notes: string | null
          request_id: string
          scheduled_at: string | null
          sort_order: number
          traveller_name: string | null
          updated_at: string
        }
        Insert: {
          airline?: string | null
          airport?: string | null
          created_at?: string
          direction?: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          request_id: string
          scheduled_at?: string | null
          sort_order?: number
          traveller_name?: string | null
          updated_at?: string
        }
        Update: {
          airline?: string | null
          airport?: string | null
          created_at?: string
          direction?: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          scheduled_at?: string | null
          sort_order?: number
          traveller_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_flights_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_staff_assignments: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          request_id: string
          role: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          role?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          role?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_staff_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "tour_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      request_vehicle_assignments: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          request_id: string
          seats_used: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          seats_used?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          seats_used?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_vehicle_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          archived_at: string | null
          client_id: string | null
          client_question: string | null
          created_at: string
          date_received: string
          follow_up_outcome: string | null
          group_size: number | null
          handled_by: string | null
          heard_about_us: string | null
          id: string
          last_contact_at: string | null
          next_action: string | null
          next_action_due_at: string | null
          preferred_room_type: string | null
          preferred_start_date: string | null
          priority: string | null
          reference: string
          requested_for_date: string | null
          requested_tour_type: string | null
          source: string | null
          stage: string
          status: string | null
          status_changed_at: string
          total_booking_value: number | null
          tour_id: string | null
          travelers_adults: number | null
          travelers_children_older: number | null
          travelers_children_younger: number | null
          trip_length_nights: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          client_question?: string | null
          created_at?: string
          date_received?: string
          follow_up_outcome?: string | null
          group_size?: number | null
          handled_by?: string | null
          heard_about_us?: string | null
          id?: string
          last_contact_at?: string | null
          next_action?: string | null
          next_action_due_at?: string | null
          preferred_room_type?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          reference?: string
          requested_for_date?: string | null
          requested_tour_type?: string | null
          source?: string | null
          stage?: string
          status?: string | null
          status_changed_at?: string
          total_booking_value?: number | null
          tour_id?: string | null
          travelers_adults?: number | null
          travelers_children_older?: number | null
          travelers_children_younger?: number | null
          trip_length_nights?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          client_question?: string | null
          created_at?: string
          date_received?: string
          follow_up_outcome?: string | null
          group_size?: number | null
          handled_by?: string | null
          heard_about_us?: string | null
          id?: string
          last_contact_at?: string | null
          next_action?: string | null
          next_action_due_at?: string | null
          preferred_room_type?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          reference?: string
          requested_for_date?: string | null
          requested_tour_type?: string | null
          source?: string | null
          stage?: string
          status?: string | null
          status_changed_at?: string
          total_booking_value?: number | null
          tour_id?: string | null
          travelers_adults?: number | null
          travelers_children_older?: number | null
          travelers_children_younger?: number | null
          trip_length_nights?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          accommodation_id: string
          amenities: string[]
          bed_config: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_occupancy: number
          name: string
          room_type: string | null
          size_m2: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          accommodation_id: string
          amenities?: string[]
          bed_config?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_occupancy?: number
          name: string
          room_type?: string | null
          size_m2?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accommodation_id?: string
          amenities?: string[]
          bed_config?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_occupancy?: number
          name?: string
          room_type?: string | null
          size_m2?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_deposits: {
        Row: {
          amount_usd: number
          booking_id: string
          booking_traveller_id: string | null
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          motorbike_id: string | null
          notes: string | null
          reference: string | null
          retained_reason: string | null
          returned_amount_usd: number
          returned_at: string | null
          rider_name: string | null
          taken_at: string
          updated_at: string
        }
        Insert: {
          amount_usd: number
          booking_id: string
          booking_traveller_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          motorbike_id?: string | null
          notes?: string | null
          reference?: string | null
          retained_reason?: string | null
          returned_amount_usd?: number
          returned_at?: string | null
          rider_name?: string | null
          taken_at?: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          booking_id?: string
          booking_traveller_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          motorbike_id?: string | null
          notes?: string | null
          reference?: string | null
          retained_reason?: string | null
          returned_amount_usd?: number
          returned_at?: string | null
          rider_name?: string | null
          taken_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_deposits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposits_booking_traveller_id_fkey"
            columns: ["booking_traveller_id"]
            isOneToOne: false
            referencedRelation: "booking_travellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposits_motorbike_id_fkey"
            columns: ["motorbike_id"]
            isOneToOne: false
            referencedRelation: "motorbikes"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          default_price_usd: number
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string
          pricing_unit: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price_usd?: number
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en: string
          pricing_unit?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price_usd?: number
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string
          pricing_unit?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          created_at: string
          handle: string | null
          id: string
          is_enabled: boolean
          platform: string
          profile_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          handle?: string | null
          id?: string
          is_enabled?: boolean
          platform: string
          profile_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          handle?: string | null
          id?: string
          is_enabled?: boolean
          platform?: string
          profile_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      social_videos: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          destination_id: string | null
          external_id: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          platform: string
          post_url: string
          published_at: string | null
          sort_order: number
          thumbnail_url: string | null
          title_ar: string | null
          title_en: string | null
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          external_id?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          platform: string
          post_url: string
          published_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title_ar?: string | null
          title_en?: string | null
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          external_id?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          platform?: string
          post_url?: string
          published_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title_ar?: string | null
          title_en?: string | null
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_videos_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_videos_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_costs: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount_usd: number
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          paid_at: string
          quote_id: string | null
          reference: string | null
          supplier_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          quote_id?: string | null
          reference?: string | null
          supplier_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          quote_id?: string | null
          reference?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_rate_cards: {
        Row: {
          cost_category: string
          created_at: string
          currency: string
          entity_id: string | null
          entity_type: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          cost_category: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          valid_from: string
          valid_to: string
        }
        Update: {
          cost_category?: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rate_cards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_rates: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          max_group_size: number | null
          metadata: Json
          min_group_size: number | null
          percent_of_adult: number | null
          pricing_unit: string
          rate_card_id: string
          residency: string
          room_category: string | null
          sort_order: number
          traveller_category: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          max_group_size?: number | null
          metadata?: Json
          min_group_size?: number | null
          percent_of_adult?: number | null
          pricing_unit: string
          rate_card_id: string
          residency?: string
          room_category?: string | null
          sort_order?: number
          traveller_category?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          max_group_size?: number | null
          metadata?: Json
          min_group_size?: number | null
          percent_of_adult?: number | null
          pricing_unit?: string
          rate_card_id?: string
          residency?: string
          room_category?: string | null
          sort_order?: number
          traveller_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_rates_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "supplier_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          supplier_type: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          supplier_type?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          supplier_type?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          auto_generated: boolean
          automation_key: string | null
          booking_id: string | null
          created_at: string
          departure_id: string | null
          due_date: string | null
          id: string
          is_done: boolean
          owner_id: string | null
          priority: string
          quote_id: string | null
          request_id: string | null
          sort_order: number
          status: string
          title: string
          type: string
        }
        Insert: {
          auto_generated?: boolean
          automation_key?: string | null
          booking_id?: string | null
          created_at?: string
          departure_id?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          owner_id?: string | null
          priority?: string
          quote_id?: string | null
          request_id?: string | null
          sort_order?: number
          status?: string
          title: string
          type?: string
        }
        Update: {
          auto_generated?: boolean
          automation_key?: string | null
          booking_id?: string | null
          created_at?: string
          departure_id?: string | null
          due_date?: string | null
          id?: string
          is_done?: boolean
          owner_id?: string | null
          priority?: string
          quote_id?: string | null
          request_id?: string | null
          sort_order?: number
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_content_sections: {
        Row: {
          content_ar: string | null
          content_en: string | null
          created_at: string
          id: string
          is_enabled: boolean
          section_key: string
          sort_order: number
          title_ar: string | null
          title_en: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          section_key: string
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          section_key?: string
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_content_sections_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_day_activities: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      tour_days: {
        Row: {
          accommodation_alt_id: string | null
          accommodation_id: string | null
          activities: Json
          activity_ids: string[]
          created_at: string
          day_number: number
          day_number_end: number | null
          description_ar: string | null
          description_en: string | null
          destination_id: string | null
          distance_km: number | null
          id: string
          image_url: string | null
          meal_breakfast: boolean
          meal_dinner: boolean
          meal_lunch: boolean
          road_distance_km: number | null
          title_ar: string | null
          title_en: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          accommodation_alt_id?: string | null
          accommodation_id?: string | null
          activities?: Json
          activity_ids?: string[]
          created_at?: string
          day_number: number
          day_number_end?: number | null
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          distance_km?: number | null
          id?: string
          image_url?: string | null
          meal_breakfast?: boolean
          meal_dinner?: boolean
          meal_lunch?: boolean
          road_distance_km?: number | null
          title_ar?: string | null
          title_en?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          accommodation_alt_id?: string | null
          accommodation_id?: string | null
          activities?: Json
          activity_ids?: string[]
          created_at?: string
          day_number?: number
          day_number_end?: number | null
          description_ar?: string | null
          description_en?: string | null
          destination_id?: string | null
          distance_km?: number | null
          id?: string
          image_url?: string | null
          meal_breakfast?: boolean
          meal_dinner?: boolean
          meal_lunch?: boolean
          road_distance_km?: number | null
          title_ar?: string | null
          title_en?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_days_accommodation_alt_id_fkey"
            columns: ["accommodation_alt_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_days_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_days_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_days_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_seo: {
        Row: {
          created_at: string
          hero_alt_ar: string | null
          hero_alt_en: string | null
          id: string
          meta_description_ar: string | null
          meta_description_en: string | null
          og_description_ar: string | null
          og_description_en: string | null
          og_title_ar: string | null
          og_title_en: string | null
          primary_keyword_ar: string | null
          primary_keyword_en: string | null
          search_intent: string | null
          secondary_keywords_ar: string[]
          secondary_keywords_en: string[]
          seo_intro_ar: string | null
          seo_intro_en: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_alt_ar?: string | null
          hero_alt_en?: string | null
          id?: string
          meta_description_ar?: string | null
          meta_description_en?: string | null
          og_description_ar?: string | null
          og_description_en?: string | null
          og_title_ar?: string | null
          og_title_en?: string | null
          primary_keyword_ar?: string | null
          primary_keyword_en?: string | null
          search_intent?: string | null
          secondary_keywords_ar?: string[]
          secondary_keywords_en?: string[]
          seo_intro_ar?: string | null
          seo_intro_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_alt_ar?: string | null
          hero_alt_en?: string | null
          id?: string
          meta_description_ar?: string | null
          meta_description_en?: string | null
          og_description_ar?: string | null
          og_description_en?: string | null
          og_title_ar?: string | null
          og_title_en?: string | null
          primary_keyword_ar?: string | null
          primary_keyword_en?: string | null
          search_intent?: string | null
          secondary_keywords_ar?: string[]
          secondary_keywords_en?: string[]
          seo_intro_ar?: string | null
          seo_intro_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_seo_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: true
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tour_templates: {
        Row: {
          config_json: Json
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          accommodation_level: string | null
          base_price_usd: number | null
          comfort_rating: number
          countries_visited: string | null
          created_at: string
          deposit_percent: number | null
          description_ar: string | null
          description_en: string | null
          difficulty_rating: number | null
          duration_days: number | null
          duration_nights: number | null
          end_destination: string | null
          excluded_ar: string[] | null
          excluded_en: string[] | null
          faqs: Json
          featured: boolean
          gallery_urls: string[]
          hero_image_url: string | null
          highlights_ar: string[] | null
          highlights_en: string[] | null
          id: string
          included_ar: string[] | null
          included_en: string[] | null
          is_active: boolean
          max_group_size: number | null
          min_group_size: number | null
          overview_ar: string | null
          overview_en: string | null
          route_map_url: string | null
          show_on_website: boolean
          slug: string | null
          start_destination: string | null
          status: string
          subtitle_ar: string | null
          subtitle_en: string | null
          template_id: string | null
          terrain: string | null
          title_ar: string | null
          title_en: string
          total_distance_km: number | null
          type: string
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          accommodation_level?: string | null
          base_price_usd?: number | null
          comfort_rating?: number
          countries_visited?: string | null
          created_at?: string
          deposit_percent?: number | null
          description_ar?: string | null
          description_en?: string | null
          difficulty_rating?: number | null
          duration_days?: number | null
          duration_nights?: number | null
          end_destination?: string | null
          excluded_ar?: string[] | null
          excluded_en?: string[] | null
          faqs?: Json
          featured?: boolean
          gallery_urls?: string[]
          hero_image_url?: string | null
          highlights_ar?: string[] | null
          highlights_en?: string[] | null
          id?: string
          included_ar?: string[] | null
          included_en?: string[] | null
          is_active?: boolean
          max_group_size?: number | null
          min_group_size?: number | null
          overview_ar?: string | null
          overview_en?: string | null
          route_map_url?: string | null
          show_on_website?: boolean
          slug?: string | null
          start_destination?: string | null
          status?: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          template_id?: string | null
          terrain?: string | null
          title_ar?: string | null
          title_en: string
          total_distance_km?: number | null
          type?: string
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          accommodation_level?: string | null
          base_price_usd?: number | null
          comfort_rating?: number
          countries_visited?: string | null
          created_at?: string
          deposit_percent?: number | null
          description_ar?: string | null
          description_en?: string | null
          difficulty_rating?: number | null
          duration_days?: number | null
          duration_nights?: number | null
          end_destination?: string | null
          excluded_ar?: string[] | null
          excluded_en?: string[] | null
          faqs?: Json
          featured?: boolean
          gallery_urls?: string[]
          hero_image_url?: string | null
          highlights_ar?: string[] | null
          highlights_en?: string[] | null
          id?: string
          included_ar?: string[] | null
          included_en?: string[] | null
          is_active?: boolean
          max_group_size?: number | null
          min_group_size?: number | null
          overview_ar?: string | null
          overview_en?: string | null
          route_map_url?: string | null
          show_on_website?: boolean
          slug?: string | null
          start_destination?: string | null
          status?: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          template_id?: string | null
          terrain?: string | null
          title_ar?: string | null
          title_en?: string
          total_distance_km?: number | null
          type?: string
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tour_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      traveller_age_bands: {
        Row: {
          allowed_room_categories: string[]
          code: string
          created_at: string
          default_fixed_amount_usd: number | null
          default_percentage: number | null
          default_pricing_method: string
          id: string
          is_active: boolean
          max_age: number | null
          min_age: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_room_categories?: string[]
          code: string
          created_at?: string
          default_fixed_amount_usd?: number | null
          default_percentage?: number | null
          default_pricing_method?: string
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_room_categories?: string[]
          code?: string
          created_at?: string
          default_fixed_amount_usd?: number | null
          default_percentage?: number | null
          default_pricing_method?: string
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      traveller_agreements: {
        Row: {
          access_token: string | null
          agreement_template_id: string | null
          body_snapshot: string | null
          booking_traveller_id: string
          created_at: string
          departure_id: string | null
          expires_at: string
          id: string
          ip_address: string | null
          language_snapshot: string | null
          last_emailed_at: string | null
          reminder_count: number
          revoked_at: string | null
          signed_at: string | null
          signed_name: string | null
          status: string
          terms_accepted: boolean
          title_snapshot: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          access_token?: string | null
          agreement_template_id?: string | null
          body_snapshot?: string | null
          booking_traveller_id: string
          created_at?: string
          departure_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          language_snapshot?: string | null
          last_emailed_at?: string | null
          reminder_count?: number
          revoked_at?: string | null
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          terms_accepted?: boolean
          title_snapshot?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          access_token?: string | null
          agreement_template_id?: string | null
          body_snapshot?: string | null
          booking_traveller_id?: string
          created_at?: string
          departure_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          language_snapshot?: string | null
          last_emailed_at?: string | null
          reminder_count?: number
          revoked_at?: string | null
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          terms_accepted?: boolean
          title_snapshot?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traveller_agreements_agreement_template_id_fkey"
            columns: ["agreement_template_id"]
            isOneToOne: false
            referencedRelation: "agreement_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traveller_agreements_booking_traveller_id_fkey"
            columns: ["booking_traveller_id"]
            isOneToOne: true
            referencedRelation: "booking_travellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traveller_agreements_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_payments: {
        Row: {
          amount_usd: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string | null
          notes: string | null
          payment_type: string
          quote_id: string | null
          received_at: string
          reference: string | null
          source_id: string | null
          source_table: string | null
          updated_at: string
        }
        Insert: {
          amount_usd: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          payment_type?: string
          quote_id?: string | null
          received_at?: string
          reference?: string | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          payment_type?: string
          quote_id?: string | null
          received_at?: string
          reference?: string | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_services: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name_ar: string | null
          name_en: string
          notes: string | null
          quantity: number
          quote_id: string | null
          service_id: string
          total_usd: number | null
          unit_price_usd: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name_ar?: string | null
          name_en: string
          notes?: string | null
          quantity?: number
          quote_id?: string | null
          service_id: string
          total_usd?: number | null
          unit_price_usd: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string
          notes?: string | null
          quantity?: number
          quote_id?: string | null
          service_id?: string
          total_usd?: number | null
          unit_price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_services_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_pricing: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          count: number
          created_at: string
          description_en: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          seats: number
          type: string
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          seats?: number
          type?: string
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          seats?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlists: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          collected_country: string | null
          collected_email: string | null
          collected_name: string | null
          collected_question: string | null
          created_at: string
          id: string
          step: string
          updated_at: string
          wa_id: string
        }
        Insert: {
          collected_country?: string | null
          collected_email?: string | null
          collected_name?: string | null
          collected_question?: string | null
          created_at?: string
          id?: string
          step?: string
          updated_at?: string
          wa_id: string
        }
        Update: {
          collected_country?: string | null
          collected_email?: string | null
          collected_name?: string | null
          collected_question?: string | null
          created_at?: string
          id?: string
          step?: string
          updated_at?: string
          wa_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote_atomic: {
        Args: {
          p_client_name?: string
          p_delivery_id?: string
          p_ip_address?: string
          p_is_admin?: boolean
          p_quote_id: string
          p_user_agent?: string
          p_version_id: string
        }
        Returns: Json
      }
      assert_quote_version_mutable: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      consume_api_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      copy_quote_as_new: {
        Args: {
          p_client_id: string
          p_request_id: string
          p_source_quote_id: string
        }
        Returns: string
      }
      copy_quote_for_client: {
        Args: {
          p_client_id: string
          p_request_id?: string
          p_source_quote_id: string
        }
        Returns: string
      }
      copy_proposal_template_atomic: {
        Args: {
          p_client_id: string
          p_created_by?: string
          p_owner_id?: string
          p_request_id?: string
          p_source_quote_id: string
        }
        Returns: string
      }
      correct_legacy_trip_value_atomic: {
        Args: { p_booking_id: string; p_total_price_usd: number }
        Returns: Json
      }
      create_departure_booking_atomic: {
        Args: {
          p_booking_link_id?: string
          p_departure_id: string
          p_room_type?: string
          p_source?: string
          p_travellers: Json
          p_user_id?: string
        }
        Returns: Json
      }
      create_manual_booking_atomic: {
        Args: {
          p_client_id?: string
          p_created_by?: string
          p_departure_id?: string
          p_deposit_method?: string
          p_deposit_reference?: string
          p_deposit_usd?: number
          p_end_date?: string
          p_request_id?: string
          p_start_date?: string
          p_status?: string
          p_total_price_usd?: number
          p_traveller_count?: number
          p_travellers?: Json
        }
        Returns: Json
      }
      create_quote_with_version: {
        Args: {
          p_client_id: string
          p_created_by: string
          p_departure_id: string
          p_mode: string
          p_request_id: string
          p_title: string
          p_tour_id: string
        }
        Returns: string
      }
      create_quote_with_workflow_atomic: {
        Args: {
          p_client_id: string
          p_created_by: string
          p_departure_id: string
          p_mode: string
          p_owner_id?: string
          p_request_id: string
          p_title: string
          p_tour_id: string
        }
        Returns: string
      }
      create_sales_request_atomic: {
        Args: {
          p_adults?: number
          p_children_older?: number
          p_children_younger?: number
          p_client_question?: string
          p_country?: string
          p_create_quote?: boolean
          p_created_by?: string
          p_departure_id?: string
          p_email?: string
          p_existing_client_id?: string
          p_first_name?: string
          p_language?: string
          p_last_name?: string
          p_phone?: string
          p_preferred_room_type?: string
          p_preferred_start_date?: string
          p_priority?: boolean
          p_quote_mode?: string
          p_quote_title?: string
          p_source?: string
          p_tour_id?: string
          p_trip_length_nights?: number
          p_whatsapp?: string
        }
        Returns: Json
      }
      create_sales_request_with_workflow_atomic: {
        Args: {
          p_adults?: number
          p_children_older?: number
          p_children_younger?: number
          p_client_question?: string
          p_country?: string
          p_create_quote?: boolean
          p_created_by?: string
          p_departure_id?: string
          p_email?: string
          p_existing_client_id?: string
          p_first_name?: string
          p_language?: string
          p_last_name?: string
          p_owner_id?: string
          p_phone?: string
          p_preferred_room_type?: string
          p_preferred_start_date?: string
          p_priority?: boolean
          p_quote_mode?: string
          p_quote_title?: string
          p_source?: string
          p_tour_id?: string
          p_trip_length_nights?: number
          p_whatsapp?: string
        }
        Returns: Json
      }
      decline_quote_atomic: {
        Args: {
          p_delivery_id: string
          p_quote_id: string
          p_version_id: string
        }
        Returns: Json
      }
      generate_quote_number: { Args: never; Returns: string }
      ingest_enquiry_atomic: { Args: { p_payload: Json }; Returns: Json }
      is_admin_user: { Args: never; Returns: boolean }
      next_invoice_number: { Args: never; Returns: string }
      save_proposal_pricing_atomic: {
        Args: {
          p_band_prices?: Json
          p_exclusions?: string[]
          p_inclusions?: string[]
          p_payload: Json
        }
        Returns: Json
      }
      save_quote_itinerary: {
        Args: { p_days: Json; p_version_id: string }
        Returns: undefined
      }
      save_trip: { Args: { p_payload: Json }; Returns: Json }
      slugify: { Args: { value: string }; Returns: string }
      tours_unique_slug: {
        Args: { base: string; exclude_id: string }
        Returns: string
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
    Enums: {},
  },
} as const
