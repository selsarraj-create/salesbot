"""
Enhanced lead management functions with new status workflow and manual mode.
Handles lead creation, tracking, conversation context, and manual takeover.
"""

import random
import string
from datetime import datetime
from typing import Optional, List, Dict, Any
from .supabase_client import get_supabase_client


# Valid status values
VALID_STATUSES = [
    'New',
    'Qualifying',
    'Booking_Offered',
    'Booked',
    'Objection_Distance',
    'Human_Required'
]


def generate_lead_code() -> str:
    """
    Generate a unique lead tracking code with # prefix.
    Format: #[3 uppercase letters][3 digits]
    Example: #LON001, #NYC123
    
    Returns:
        str: Unique lead code starting with #
    """
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=3))
    return f"#{letters}{numbers}"


def get_or_create_lead(phone: str) -> Dict[str, Any]:
    """
    Retrieve existing lead or create new one.
    
    Args:
        phone: Lead's phone number in E.164 format
        
    Returns:
        dict: Lead record with id, phone, name, lead_code, status, is_manual_mode
        
    Raises:
        Exception: If database operation fails
    """
    client = get_supabase_client()
    
    # Try to find existing lead
    response = client.table("leads").select("*").eq("phone", phone).execute()
    
    if response.data and len(response.data) > 0:
        return response.data[0]
    
    # Create new lead with unique code
    max_attempts = 5
    for attempt in range(max_attempts):
        lead_code = generate_lead_code()
        
        try:
            new_lead = {
                "phone": phone,
                "lead_code": lead_code,
                "status": "New",
                "is_manual_mode": False
            }
            
            response = client.table("leads").insert(new_lead).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
        except Exception as e:
            # If unique constraint fails, try again with new code
            if attempt == max_attempts - 1:
                raise Exception(f"Failed to create lead after {max_attempts} attempts: {e}")
            continue
    
    raise Exception("Failed to create lead")


def update_lead_name(phone: str, name: str) -> bool:
    """
    Update lead's name in database.
    
    Args:
        phone: Lead's phone number
        name: Lead's name
        
    Returns:
        bool: True if update successful
    """
    try:
        client = get_supabase_client()
        client.table("leads").update({"name": name}).eq("phone", phone).execute()
        return True
    except Exception as e:
        print(f"Error updating lead name: {e}")
        return False


def update_lead_status(phone: str, status: str) -> bool:
    """
    Update lead's status in database.
    Valid statuses: New, Qualifying, Booking_Offered, Booked, Objection_Distance, Human_Required
    
    Args:
        phone: Lead's phone number
        status: New status value
        
    Returns:
        bool: True if update successful
    """
    if status not in VALID_STATUSES:
        print(f"Invalid status: {status}. Must be one of {VALID_STATUSES}")
        return False
    
    try:
        client = get_supabase_client()
        client.table("leads").update({"status": status}).eq("phone", phone).execute()
        return True
    except Exception as e:
        print(f"Error updating lead status: {e}")
        return False


def set_manual_mode(lead_id: str, enabled: bool) -> bool:
    """
    Enable or disable manual mode for a lead (takeover functionality).
    
    Args:
        lead_id: Lead's UUID
        enabled: True to enable manual mode, False to disable
        
    Returns:
        bool: True if update successful
    """
    try:
        client = get_supabase_client()
        client.table("leads").update({"is_manual_mode": enabled}).eq("id", lead_id).execute()
        return True
    except Exception as e:
        print(f"Error setting manual mode: {e}")
        return False


def is_lead_in_manual_mode(phone: str) -> bool:
    """
    Check if lead is in manual mode.
    
    Args:
        phone: Lead's phone number
        
    Returns:
        bool: True if in manual mode, False otherwise
    """
    try:
        client = get_supabase_client()
        response = client.table("leads").select("is_manual_mode").eq("phone", phone).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0].get("is_manual_mode", False)
        return False
    except Exception as e:
        print(f"Error checking manual mode: {e}")
        return False


def save_message(phone: str, sender_type: str, content: str) -> bool:
    """
    Save message to messages table.
    
    Args:
        phone: Lead's phone number
        sender_type: Either 'lead', 'bot', or 'human'
        content: Message content
        
    Returns:
        bool: True if save successful
    """
    if sender_type not in ['lead', 'bot', 'human']:
        print(f"Invalid sender_type: {sender_type}. Must be 'lead', 'bot', or 'human'")
        return False
    
    try:
        client = get_supabase_client()
        
        # Get lead_id
        lead = get_or_create_lead(phone)
        
        message_entry = {
            "lead_id": lead["id"],
            "content": content,
            "sender_type": sender_type
        }
        
        client.table("messages").insert(message_entry).execute()
        return True
    except Exception as e:
        print(f"Error saving message: {e}")
        return False


def get_messages(phone: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Retrieve recent messages for a lead.
    Returns messages in chronological order (oldest first).
    
    Args:
        phone: Lead's phone number
        limit: Maximum number of messages to retrieve
        
    Returns:
        list: List of message dicts with sender_type, content, timestamp
    """
    try:
        client = get_supabase_client()
        
        # Get lead_id first
        lead = get_or_create_lead(phone)
        
        response = (
            client.table("messages")
            .select("sender_type, content, timestamp")
            .eq("lead_id", lead["id"])
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        
        # Reverse to get chronological order (oldest first)
        messages = list(reversed(response.data)) if response.data else []
        return messages
    except Exception as e:
        print(f"Error retrieving messages: {e}")
        return []


def format_messages_for_ai(messages: List[Dict[str, Any]]) -> str:
    """
    Format message history into a readable string for AI context.
    
    Args:
        messages: List of message dicts from get_messages()
        
    Returns:
        str: Formatted conversation history
    """
    if not messages:
        return "No previous conversation history."
    
    formatted = ["Previous conversation:"]
    
    for msg in messages:
        sender_type = msg["sender_type"]
        if sender_type == "lead":
            sender_label = "Customer"
        elif sender_type == "human":
            sender_label = "Human Agent"
        else:
            sender_label = "You"
        
        formatted.append(f"{sender_label}: {msg['content']}")
    
    return "\n".join(formatted)


def get_lead_by_id(lead_id: str) -> Optional[Dict[str, Any]]:
    """
    Get lead by UUID.
    
    Args:
        lead_id: Lead's UUID
        
    Returns:
        dict: Lead record or None if not found
    """
    try:
        client = get_supabase_client()
        response = client.table("leads").select("*").eq("id", lead_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error getting lead by ID: {e}")
        return None
