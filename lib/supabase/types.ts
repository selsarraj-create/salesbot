export interface Lead {
    id: string;
    created_at: string;
    lead_code: string;
    name?: string;
    phone: string;
    status: string;
    is_test?: boolean;
    is_manual_mode?: boolean;
    context_memory?: any;
    priority_score?: number;
    shoot_date?: string;
    last_contacted_at?: string;
    follow_up_count?: number;
    lead_metadata?: any; // e.g. { age: '25', name: 'Sarah' }
}

export type LeadStatus =
    | 'New'
    | 'Qualifying'
    | 'Booking_Offered'
    | 'Booked'
    | 'Objection_Distance'
    | 'Human_Required';

export interface Message {
    id: string;
    created_at?: string;
    timestamp?: string;
    lead_id: string;
    content: string;
    sender_type: 'lead' | 'bot';
    review_status?: 'pending' | 'approved' | 'gold' | 'corrected' | 'skipped';
}

export interface TrainingFeedback {
    id: string;
    created_at: string;
    message_id?: string;
    original_prompt: string;
    ai_response: string;
    manager_correction?: string;
    objection_type?: string;
    confidence_score?: number;
    is_gold_standard: boolean;
    sentiment_score?: number;
    embedding?: number[]; // Vector embedding
}

export interface SimulatedScenario {
    id: string;
    created_at: string;
    scenario_name: string;
    lead_persona: string;
    target_outcome?: string;
    difficulty_level: string;
}

export interface KnowledgeVector {
    id: string;
    created_at: string;
    content: string;
    content_type: 'audio_transcript' | 'document' | 'conversation';
    metadata?: {
        filename?: string;
        duration?: number;
        speaker?: string;
        file_size?: number;
        [key: string]: any;
    };
    embedding?: number[]; // Vector embedding
    critique?: {
        objection_quality: number;
        tone: number;
        closing_power: number;
        summary: string;
    };
}

export interface Database {
    public: {
        Tables: {
            leads: {
                Row: Lead;
                Insert: Omit<Lead, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<Lead, 'id' | 'created_at'>>;
            };
            messages: {
                Row: Message;
                Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<Message, 'id' | 'created_at'>>;
            };
            training_feedback: {
                Row: TrainingFeedback;
                Insert: Omit<TrainingFeedback, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<TrainingFeedback, 'id' | 'created_at'>>;
            };
            simulated_scenarios: {
                Row: SimulatedScenario;
                Insert: Omit<SimulatedScenario, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<SimulatedScenario, 'id' | 'created_at'>>;
            };
            knowledge_vectors: {
                Row: KnowledgeVector;
                Insert: Omit<KnowledgeVector, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<KnowledgeVector, 'id' | 'created_at'>>;
            };
        };
    };
}
