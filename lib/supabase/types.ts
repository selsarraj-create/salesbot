// ===================================================
// Multi-Tenant Type Definitions
// ===================================================

// --- Tenant & Auth ---

export interface Tenant {
    id: string;
    created_at: string;
    slug: string;
    name: string;
    logo_url?: string;
    brand_color?: string;
    twilio_sid?: string;
    twilio_auth_token?: string;
    twilio_phone?: string;
    system_prompt?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    is_active?: boolean;
    monthly_ad_spend?: number;
    chatbot_name?: string;
    outbound_webhook_url?: string;
}

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'agent';

export interface UserProfile {
    id: string;
    tenant_id: string;
    role: UserRole;
    display_name?: string;
    email?: string;
    created_at: string;
}

export interface ApiKey {
    id: string;
    tenant_id: string;
    key_hash: string;
    key_prefix: string;
    label?: string;
    created_at: string;
    last_used_at?: string;
}

export interface GlobalRule {
    id: string;
    rule_text: string;
    category: 'safety' | 'compliance';
    is_active: boolean;
    created_at: string;
}

// --- Core Business Types ---

export interface Lead {
    id: string;
    created_at: string;
    tenant_id: string;
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
    lead_metadata?: any;
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
    thought_content?: string;
}

export interface TrainingFeedback {
    id: string;
    created_at: string;
    tenant_id: string;
    message_id?: string;
    original_prompt: string;
    ai_response: string;
    manager_correction?: string;
    objection_type?: string;
    confidence_score?: number;
    is_gold_standard: boolean;
    sentiment_score?: number;
    embedding?: number[];
}

export interface SimulatedScenario {
    id: string;
    created_at: string;
    tenant_id: string;
    scenario_name: string;
    lead_persona: string;
    target_outcome?: string;
    difficulty_level: string;
    lead_name?: string;
    lead_age?: number;
}

export interface KnowledgeVector {
    id: string;
    created_at: string;
    tenant_id: string;
    content: string;
    content_type: 'audio_transcript' | 'document' | 'conversation';
    metadata?: {
        filename?: string;
        duration?: number;
        speaker?: string;
        file_size?: number;
        [key: string]: any;
    };
    embedding?: number[];
    critique?: {
        objection_quality: number;
        tone: number;
        closing_power: number;
        summary: string;
    };
}

export interface SystemRule {
    id: string;
    tenant_id: string;
    rule_text: string;
    category: 'behavior' | 'constraint';
    is_active: boolean;
}

export interface AiConfig {
    id: number;
    tenant_id: string;
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    full_context_mode: boolean;
    thinking_budget?: number;
    show_thoughts?: boolean;
    updated_at?: string;
}

// --- Database Schema ---

export interface Database {
    public: {
        Tables: {
            tenants: {
                Row: Tenant;
                Insert: { slug: string; name: string } & Partial<Omit<Tenant, 'id' | 'created_at' | 'slug' | 'name'>> & { id?: string; created_at?: string };
                Update: Partial<Omit<Tenant, 'id' | 'created_at'>>;
            };
            user_profiles: {
                Row: UserProfile;
                Insert: Omit<UserProfile, 'created_at'> & { created_at?: string };
                Update: Partial<Omit<UserProfile, 'id'>>;
            };
            api_keys: {
                Row: ApiKey;
                Insert: Omit<ApiKey, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<ApiKey, 'id' | 'created_at'>>;
            };
            global_rules: {
                Row: GlobalRule;
                Insert: Omit<GlobalRule, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<GlobalRule, 'id' | 'created_at'>>;
            };
            leads: {
                Row: Lead;
                Insert: Omit<Lead, 'id' | 'created_at' | 'tenant_id'> & { id?: string; created_at?: string; tenant_id?: string };
                Update: Partial<Omit<Lead, 'id' | 'created_at'>>;
            };
            messages: {
                Row: Message;
                Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
                Update: Partial<Omit<Message, 'id' | 'created_at'>>;
            };
            training_feedback: {
                Row: TrainingFeedback;
                Insert: Omit<TrainingFeedback, 'id' | 'created_at' | 'tenant_id'> & { id?: string; created_at?: string; tenant_id?: string };
                Update: Partial<Omit<TrainingFeedback, 'id' | 'created_at'>>;
            };
            simulated_scenarios: {
                Row: SimulatedScenario;
                Insert: Omit<SimulatedScenario, 'id' | 'created_at' | 'tenant_id'> & { id?: string; created_at?: string; tenant_id?: string };
                Update: Partial<Omit<SimulatedScenario, 'id' | 'created_at'>>;
            };
            knowledge_vectors: {
                Row: KnowledgeVector;
                Insert: Omit<KnowledgeVector, 'id' | 'created_at' | 'tenant_id'> & { id?: string; created_at?: string; tenant_id?: string };
                Update: Partial<Omit<KnowledgeVector, 'id' | 'created_at'>>;
            };
            system_rules: {
                Row: SystemRule;
                Insert: Omit<SystemRule, 'id' | 'tenant_id'> & { id?: string; tenant_id?: string };
                Update: Partial<Omit<SystemRule, 'id'>>;
            };
            ai_config: {
                Row: AiConfig;
                Insert: Omit<AiConfig, 'id' | 'tenant_id'> & { id?: number; tenant_id?: string };
                Update: Partial<Omit<AiConfig, 'id'>>;
            };
        };
    };
}
