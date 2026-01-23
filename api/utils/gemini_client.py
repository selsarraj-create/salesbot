"""
Enhanced Gemini 3 Pro client with distance objection detection and qualification workflow.
Implements reasoning mode with status-aware response generation.
"""

import os
import re
from typing import Optional, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv
from .sales_prompts import (
    SALES_PERSONA_PROMPT,
    OBJECTION_RESPONSES,
    get_calendar_slots,
    format_slots_message,
    get_booking_confirmation,
    get_qualification_questions
)
from .lead_manager import format_messages_for_ai

load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class GeminiSalesAgent:
    """
    AI Sales Agent powered by Gemini 3 Pro with reasoning capabilities.
    Enhanced with distance objection detection and qualification workflow.
    """
    
    def __init__(self):
        """Initialize Gemini model with reasoning configuration."""
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-thinking-exp-1219",  # Gemini 3 Pro with thinking
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 500,  # Keep SMS responses concise
            }
        )
    
    def analyze_message(self, message: str, current_status: str) -> Dict[str, Any]:
        """
        Analyze incoming message to detect intent, objections, and next actions.
        This is the "thinking step" before generating response.
        
        Args:
            message: Lead's incoming message
            current_status: Current lead status
            
        Returns:
            dict: Analysis with intent, objection_type, sentiment, suggested_status
        """
        analysis_prompt = f"""Analyze this message from a potential modeling client and identify:
1. Intent (interested/objection/question/booking/stop/qualifying_response)
2. Objection type if any (distance/busy/cost/experience/nervous/thinking/none)
3. Sentiment (positive/neutral/negative)
4. Name mentioned (if any)
5. Suggested next status based on conversation flow

Current lead status: {current_status}

Message: "{message}"

Respond in this exact format:
Intent: [intent]
Objection: [objection_type]
Sentiment: [sentiment]
Name: [name or none]
Suggested_Status: [New/Qualifying/Booking_Offered/Booked/Objection_Distance/Human_Required]
"""
        
        try:
            response = self.model.generate_content(analysis_prompt)
            analysis_text = response.text
            
            # Parse response
            intent_match = re.search(r'Intent:\s*(\w+)', analysis_text, re.IGNORECASE)
            objection_match = re.search(r'Objection:\s*(\w+)', analysis_text, re.IGNORECASE)
            sentiment_match = re.search(r'Sentiment:\s*(\w+)', analysis_text, re.IGNORECASE)
            name_match = re.search(r'Name:\s*(.+?)(?:\n|$)', analysis_text, re.IGNORECASE)
            status_match = re.search(r'Suggested_Status:\s*(\w+)', analysis_text, re.IGNORECASE)
            
            objection_type = objection_match.group(1).lower() if objection_match else "none"
            
            # Detect distance objection keywords
            distance_keywords = ['far', 'distance', 'travel', 'location', 'where', 'come to you']
            if any(keyword in message.lower() for keyword in distance_keywords):
                objection_type = "distance"
            
            return {
                "intent": intent_match.group(1).lower() if intent_match else "unknown",
                "objection_type": objection_type,
                "sentiment": sentiment_match.group(1).lower() if sentiment_match else "neutral",
                "name": name_match.group(1).strip() if name_match and name_match.group(1).lower() != "none" else None,
                "suggested_status": status_match.group(1) if status_match else current_status
            }
        except Exception as e:
            print(f"Error analyzing message: {e}")
            return {
                "intent": "unknown",
                "objection_type": "none",
                "sentiment": "neutral",
                "name": None,
                "suggested_status": current_status
            }
    
    def generate_response(
        self,
        incoming_message: str,
        message_history: list,
        lead_name: Optional[str] = None,
        current_status: str = "New",
        analysis: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate context-aware sales response using Gemini 3 Pro.
        
        Args:
            incoming_message: Current message from lead
            message_history: Previous conversation messages
            lead_name: Lead's name if known
            current_status: Current lead status
            analysis: Pre-computed message analysis
            
        Returns:
            str: AI-generated response
        """
        # Format conversation context
        context = format_messages_for_ai(message_history)
        
        # Build prompt with context
        name_context = f"The customer's name is {lead_name}." if lead_name else "You don't know the customer's name yet."
        status_context = f"Current lead status: {current_status}"
        
        # Add context validation rules
        context_validation = f"""
CRITICAL CONTEXT RULES:
1. ALWAYS check the last message in the conversation history above
2. If the lead just answered a question, ACKNOWLEDGE their answer first
3. DO NOT repeat the greeting if the conversation has already started
4. If you see previous messages in the history, this is an ONGOING conversation - continue from where you left off
5. The customer's LATEST message is: "{incoming_message}" - respond to THIS message specifically, not to an imagined first contact
"""
        
        # Add analysis context if available
        analysis_context = ""
        if analysis:
            if analysis["objection_type"] == "distance":
                analysis_context = "\n\nDETECTED OBJECTION: DISTANCE/TOO FAR\nUse the '90% of pros started by traveling to us' rebuttal. Emphasize that the best opportunities are worth the journey."
            elif analysis["objection_type"] != "none":
                analysis_context = f"\n\nDETECTED OBJECTION: {analysis['objection_type']}\nUse your training to handle this objection professionally and convert them."
            if analysis["intent"] == "stop":
                analysis_context += "\n\nIMPORTANT: Customer wants to opt out. Acknowledge politely and confirm removal."
        
        # Add status-specific guidance
        status_guidance = ""
        if current_status == "New":
            status_guidance = "\n\nNEXT STEP: Start qualifying them. Ask about their modeling goals and availability."
        elif current_status == "Qualifying":
            status_guidance = "\n\nNEXT STEP: Continue qualification or move to booking if they're interested."
        elif current_status == "Booking_Offered":
            status_guidance = "\n\nNEXT STEP: Confirm their slot selection or handle any remaining objections."
        
        prompt = f"""{SALES_PERSONA_PROMPT}

{name_context}
{status_context}

{context}
{context_validation}

Customer's latest message: "{incoming_message}"
{analysis_context}
{status_guidance}

Generate your response (keep it under 160 characters if possible, max 300):"""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            # Fallback response
            return "Thanks for your message! Let me get back to you shortly. 😊"
    
    def handle_booking_request(self, lead_name: Optional[str] = None) -> str:
        """
        Generate message with available booking slots.
        
        Args:
            lead_name: Lead's name if known
            
        Returns:
            str: Message with calendar slots
        """
        slots = get_calendar_slots(3)
        return format_slots_message(slots)
    
    def confirm_booking(self, slot: str, lead_name: Optional[str] = None) -> str:
        """
        Generate booking confirmation message.
        
        Args:
            slot: Selected time slot
            lead_name: Lead's name if known
            
        Returns:
            str: Confirmation message
        """
        return get_booking_confirmation(slot, lead_name)


# Singleton instance
_agent_instance: Optional[GeminiSalesAgent] = None


def get_gemini_agent() -> GeminiSalesAgent:
    """
    Get or create Gemini Sales Agent instance.
    Uses singleton pattern for efficiency.
    
    Returns:
        GeminiSalesAgent: Configured agent instance
    """
    global _agent_instance
    
    if _agent_instance is None:
        _agent_instance = GeminiSalesAgent()
    
    return _agent_instance
