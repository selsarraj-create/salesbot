"""
Manual message sending endpoint for human agent takeover.
Allows dashboard users to send WhatsApp messages directly to leads.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from twilio.rest import Client
import os
from dotenv import load_dotenv

from api.utils.lead_manager import get_lead_by_id, save_message, is_lead_in_manual_mode

load_dotenv()

router = APIRouter()

# Initialize Twilio client
twilio_client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)
TWILIO_PHONE = os.getenv("TWILIO_PHONE_NUMBER")


class ManualMessageRequest(BaseModel):
    lead_id: str
    message: str


@router.post("/api/manual_message")
async def send_manual_message(request: ManualMessageRequest):
    """
    Send manual WhatsApp message from human agent to lead.
    Only works when lead is in manual mode.
    
    Args:
        request: Contains lead_id and message content
        
    Returns:
        dict: Success status and message details
    """
    try:
        # Get lead details
        lead = get_lead_by_id(request.lead_id)
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify lead is in manual mode
        if not lead.get("is_manual_mode", False):
            raise HTTPException(
                status_code=400,
                detail="Lead is not in manual mode. Enable takeover first."
            )
        
        phone = lead["phone"]
        
        # Send WhatsApp message via Twilio
        message = twilio_client.messages.create(
            body=request.message,
            from_=f"whatsapp:{TWILIO_PHONE}",
            to=f"whatsapp:{phone}"
        )
        
        # Save message to database
        save_message(phone, "human", request.message)
        
        return {
            "success": True,
            "message_sid": message.sid,
            "to": phone,
            "content": request.message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending manual message: {e}")
        raise HTTPException(status_code=500, detail=str(e))
