/**
 * TypeScript types for Supabase database schema.
 */

export type LeadStatus =
    | 'New'
    | 'Qualifying'
    | 'Booking_Offered'
    | 'Booked'
    | 'Objection_Distance'
    | 'Human_Required';

export type SenderType = 'bot' | 'lead' | 'human';

export interface Lead {
    id: string;
    phone: string;
    name: string | null;
    lead_code: string;
    status: LeadStatus;
    is_manual_mode: boolean;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    lead_id: string;
    content: string;
    sender_type: SenderType;
    timestamp: string;
}

export interface Database {
    public: {
        Tables: {
            leads: {
                Row: Lead;
                Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>;
            };
            messages: {
                Row: Message;
                Insert: Omit<Message, 'id' | 'timestamp'>;
                Update: Partial<Omit<Message, 'id' | 'timestamp'>>;
            };
        };
    };
}
