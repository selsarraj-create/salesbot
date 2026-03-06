"""
Enhanced FastAPI webhook endpoint for Twilio WhatsApp integration.
Handles incoming messages with manual takeover support and enhanced status workflow.
"""

from fastapi import APIRouter, Form, Response
from fastapi.responses import PlainTextResponse
from twilio.twiml.messaging_response import MessagingResponse
import os
from dotenv import load_dotenv

from api.utils.supabase_client import get_supabase_client
from api.utils.gemini_client import get_gemini_agent
from api.utils.lead_manager import (
    get_or_create_lead,
    save_message,
    get_messages,
    get_messages_with_retry,
    verify_message_saved,
    update_lead_name,
    update_lead_status,
    is_lead_in_manual_mode
)
from api.utils.sales_prompts import get_compliance_message

load_dotenv()

router = APIRouter()


@router.post("/api/webhook")
async def twilio_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: str = Form(...)
):
    """
    Enhanced Twilio WhatsApp webhook endpoint with manual takeover support.
    Receives incoming WhatsApp messages, processes with AI (if not in manual mode), and returns response.
    
    Args:
        From: Sender's phone number (whatsapp:+E.164 format, prefix stripped before storage)
        Body: Message content
        MessageSid: Twilio message identifier
        
    Returns:
        TwiML response for Twilio
    """
    try:
        # Normalize phone number — strip whatsapp: prefix for clean E.164 storage
        phone = From.strip().replace("whatsapp:", "")
        incoming_message = Body.strip()
        
        print(f"Received WhatsApp from {phone}: {incoming_message}")
        
        # Get or create lead
        lead = get_or_create_lead(phone)
        lead_name = lead.get("name")
        current_status = lead.get("status", "New")
        
        # SAFETY CHECK: Skip processing for test leads UNLESS whatsapp_mode is enabled
        if lead.get("is_test", False) and not lead.get("whatsapp_mode", False):
            print(f"⚠️ Test lead detected: {phone}. Skipping Twilio response to prevent messaging costs.")
            twiml = MessagingResponse()
            return Response(content=str(twiml), media_type="application/xml")
        
        # Save incoming message to history and verify it was saved
        message_id = save_message(phone, "lead", incoming_message)
        if message_id:
            verify_message_saved(lead["id"], message_id)
        
        # Check for STOP command
        if incoming_message.upper() in ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]:
            update_lead_status(phone, "Human_Required")
            response_text = "You've been removed from our list. Thanks for your time! 👋"
            save_message(phone, "bot", response_text)
            
            # Return TwiML response
            twiml = MessagingResponse()
            twiml.message(response_text)
            return Response(content=str(twiml), media_type="application/xml")
        
        # Check if lead is in manual mode (human takeover)
        if is_lead_in_manual_mode(phone):
            print(f"Lead {phone} is in manual mode. Skipping AI response.")
            # Don't send automatic response - human agent will respond via dashboard
            twiml = MessagingResponse()
            return Response(content=str(twiml), media_type="application/xml")
        
        # Get conversation history for context with retry logic
        # Add small delay to ensure Supabase has committed the insert
        import time
        time.sleep(0.5)
        message_history = get_messages_with_retry(phone, limit=10)
        
        # Get AI agent
        agent = get_gemini_agent()
        
        # Analyze message (thinking step)
        analysis = agent.analyze_message(incoming_message, current_status)
        
        print(f"Message analysis: {analysis}")
        
        # Extract and save name if detected
        if analysis.get("name") and not lead_name:
            lead_name = analysis["name"]
            update_lead_name(phone, lead_name)
            print(f"Detected name: {lead_name}")
        
        # Handle status transitions based on analysis
        new_status = current_status
        
        # Distance objection detected
        if analysis.get("objection_type") == "distance":
            new_status = "Objection_Distance"
            update_lead_status(phone, new_status)
        
        # Complex objection or negative sentiment - escalate to human
        elif analysis.get("sentiment") == "negative" and analysis.get("objection_type") not in ["none", "distance"]:
            new_status = "Human_Required"
            update_lead_status(phone, new_status)
        
        # Positive progression
        elif current_status == "New" and analysis.get("sentiment") == "positive":
            new_status = "Qualifying"
            update_lead_status(phone, new_status)
        
        # Handle booking intent
        if "book" in incoming_message.lower() or "slot" in incoming_message.lower() or "appointment" in incoming_message.lower():
            response_text = agent.handle_booking_request(lead_name)
            new_status = "Booking_Offered"
            update_lead_status(phone, new_status)
        
        # Handle slot selection (number response)
        elif incoming_message.strip().isdigit() and current_status == "Booking_Offered":
            slot_number = int(incoming_message.strip())
            if 1 <= slot_number <= 5:
                from api.utils.sales_prompts import get_calendar_slots
                slots = get_calendar_slots(5)
                if slot_number <= len(slots):
                    selected_slot = slots[slot_number - 1]
                    response_text = agent.confirm_booking(selected_slot, lead_name)
                    new_status = "Booked"
                    update_lead_status(phone, new_status)
                else:
                    response_text = agent.generate_response(
                        incoming_message, message_history, lead_name, new_status, analysis
                    )
            else:
                response_text = agent.generate_response(
                    incoming_message, message_history, lead_name, new_status, analysis
                )
        
        # Generate AI response
        else:
            response_text = agent.generate_response(
                incoming_message, message_history, lead_name, new_status, analysis
            )
        
        # Save bot response to history
        save_message(phone, "bot", response_text)
        
        print(f"Sending response: {response_text}")
        print(f"Lead status: {current_status} → {new_status}")
        
        # Create TwiML response
        twiml = MessagingResponse()
        twiml.message(response_text)
        
        return Response(content=str(twiml), media_type="application/xml")
    
    except Exception as e:
        print(f"Error processing webhook: {e}")
        
        # Fallback error response
        twiml = MessagingResponse()
        twiml.message("Sorry, we're experiencing technical difficulties. Please try again in a moment!")
        
        return Response(content=str(twiml), media_type="application/xml")


@router.get("/api/test")
async def test_connection():
    """
    Test endpoint to verify Supabase and Gemini connections.
    """
    try:
        from api.utils.supabase_client import test_connection
        
        supabase_ok = test_connection()
        
        # Test Gemini
        gemini_ok = False
        try:
            agent = get_gemini_agent()
            gemini_ok = True
        except Exception as e:
            print(f"Gemini test failed: {e}")
        
        return {
            "supabase": "connected" if supabase_ok else "failed",
            "gemini": "connected" if gemini_ok else "failed",
            "overall": "ok" if (supabase_ok and gemini_ok) else "error"
        }
    except Exception as e:
        return {"error": str(e)}
