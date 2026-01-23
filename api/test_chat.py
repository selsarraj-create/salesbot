"""
Test chat endpoint for Testing Sandbox.
Bypasses Twilio but uses same Gemini 3 Flash sales logic.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
from typing import Optional

from .utils.gemini_client import get_gemini_agent
from .utils.lead_manager import (
    get_lead_by_id,
    save_message,
    get_messages,
    update_lead_status
)

app = FastAPI()


class TestChatRequest(BaseModel):
    lead_id: str
    message: str
    simulate_latency: bool = False


@app.post("/api/test_chat")
async def test_chat(request: TestChatRequest):
    """
    Test chat endpoint for Testing Sandbox.
    
    - Validates lead is a test lead (is_test = true)
    - Processes message with Gemini 3 Flash
    - Saves messages to Supabase
    - Returns JSON response (not TwiML)
    - Supports latency simulation
    
    Args:
        request: Contains lead_id, message, and simulate_latency flag
        
    Returns:
        dict: Response with bot message, thinking time, and analysis
    """
    start_time = time.time()
    
    try:
        # Get lead details
        lead = get_lead_by_id(request.lead_id)
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # SAFETY CHECK: Verify this is a test lead
        if not lead.get("is_test", False):
            raise HTTPException(
                status_code=400,
                detail="This endpoint only works with test leads (is_test = true)"
            )
        
        phone = lead["phone"]
        lead_name = lead.get("name")
        current_status = lead.get("status", "New")
        
        # Save incoming message
        save_message(phone, "lead", request.message)
        
        # Get conversation history
        message_history = get_messages(phone, limit=10)
        
        # Get AI agent
        agent = get_gemini_agent()
        
        # Analyze message (thinking step)
        analysis = agent.analyze_message(request.message, current_status)
        
        print(f"Test Chat Analysis: {analysis}")
        
        # Generate AI response
        response_text = agent.generate_response(
            request.message,
            message_history,
            lead_name,
            current_status,
            analysis
        )
        
        # Update status based on analysis
        new_status = current_status
        if analysis.get("objection_type") == "distance":
            new_status = "Objection_Distance"
            update_lead_status(phone, new_status)
        elif current_status == "New" and analysis.get("sentiment") == "positive":
            new_status = "Qualifying"
            update_lead_status(phone, new_status)
        
        # Save bot response
        save_message(phone, "bot", response_text)
        
        # Calculate thinking time
        thinking_time_ms = int((time.time() - start_time) * 1000)
        
        # Simulate SMS latency if requested
        if request.simulate_latency:
            import random
            latency_ms = random.randint(1000, 3000)
            time.sleep(latency_ms / 1000)
            thinking_time_ms += latency_ms
        
        return {
            "success": True,
            "response": response_text,
            "thinking_time_ms": thinking_time_ms,
            "analysis": {
                "intent": analysis.get("intent"),
                "sentiment": analysis.get("sentiment"),
                "objection_type": analysis.get("objection_type"),
                "new_status": new_status
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in test chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For Vercel serverless deployment
handler = app
