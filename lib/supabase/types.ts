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
    is_test: boolean;
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

export interface TrainingFeedback {
    id: string;
    message_id: string | null;
    original_prompt: string;
    ai_response: string;
    manager_correction: string | null;
    objection_type: string | null;
    confidence_score: number | null;
    is_gold_standard: boolean;
    created_at: string;
}

export interface SimulatedScenario {
    id: string;
    scenario_name: string;
    lead_persona: string;
    target_outcome: string | null;
    difficulty_level: string;
    created_at: string;
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
            training_feedback: {
                Row: TrainingFeedback;
                Insert: Omit<TrainingFeedback, 'id' | 'created_at'>;
                Update: Partial<Omit<TrainingFeedback, 'id' | 'created_at'>>;
            };
            simulated_scenarios: {
                Row: SimulatedScenario;
                Insert: Omit<SimulatedScenario, 'id' | 'created_at'>;
                Update: Partial<Omit<SimulatedScenario, 'id' | 'created_at'>>;
            };
        };
    };
}
