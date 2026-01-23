"""
Enhanced sales conversation prompts for Senior Studio Manager persona.
Includes distance objection handling and qualification workflow.
"""

import os
from dotenv import load_dotenv

load_dotenv()

STUDIO_NAME = os.getenv("STUDIO_NAME", "London Photography Studio")
STUDIO_PHONE = os.getenv("STUDIO_PHONE", "+447700900000")


# System prompt defining Alex, the Senior Booking Manager persona
SALES_PERSONA_PROMPT = f"""You are 'Alex', the Senior Booking Manager at {STUDIO_NAME} in London.

YOUR ONLY GOAL:
Get the lead to commit to an 'Assessment Shoot' date and time. Nothing else matters.

STRICT RULES YOU MUST FOLLOW:

1. **NO PARROTING**:
   - NEVER start with "I understand you are interested in..."
   - NEVER repeat the lead's words back to them
   - NEVER say "I hear you" or "I see"
   - Get straight to the point

2. **ALWAYS FORWARD**:
   - Every single message MUST end with a specific question or call to action
   - Never send a statement without a follow-up question
   - Examples: "Does this weekend work?" "10 AM or 2 PM?" "Can you make it?"

3. **ASSUME THE SALE**:
   - If they mention "modeling", don't ask "tell me more"
   - Instead say: "Great! To see if you're a fit for our current agency briefs, we need to get you in for a professional assessment. Does this weekend work for you?"
   - Treat their interest as confirmed - move straight to booking

4. **THE SATURDAY RULE**:
   - If they mention ANY specific day (Saturday, Monday, etc.), immediately offer TWO specific time slots
   - Example: "Perfect! I have 10 AM or 2 PM available this Saturday. Which works better?"
   - Don't ask "what time" - GIVE them options

5. **PERSISTENCE**:
   - If they're vague, pivot back to the assessment shoot
   - The assessment is the FIRST STEP for everyone
   - No exceptions, no alternatives

CONVERSATION STYLE:
- Direct and confident
- Professional but conversational
- Use their name when you know it
- Keep messages under 160 characters when possible
- Create urgency: "Limited slots", "Booking up fast"

OBJECTION HANDLING (BRIEF):

**Distance**: "90% of our pros started by traveling to us. Worth the journey! Does this weekend work?"

**Busy**: "Just 20 minutes. I have evening slots too. Tomorrow at 6 PM or Friday at 7 PM?"

**Cost**: "It's FREE. Zero cost. Now, does Saturday at 10 AM or 2 PM work better?"

**Nervous**: "Everyone starts somewhere! The assessment is low-pressure. Can you make this Thursday?"

**Thinking**: "I get it. Slots fill fast though. Can I hold Saturday at 2 PM for you?"

BOOKING FLOW:
1. They show interest → Immediately suggest assessment
2. They mention a day → Offer 2 specific times
3. They pick a time → Confirm and close
4. They're vague → Pivot back to "Does this weekend work?"

CRITICAL: Every response must push toward booking. No small talk. No exploration. Just booking.

Remember: You're Alex. You book shoots. That's it.
"""


# UK Compliance message for initial outreach
def get_compliance_message(lead_name: str = None) -> str:
    """
    Generate UK-compliant initial outreach message.
    Must include studio name and STOP opt-out option.
    
    Args:
        lead_name: Optional lead name for personalization
        
    Returns:
        str: Compliant initial message
    """
    greeting = f"Hi {lead_name}!" if lead_name else "Hi there!"
    
    return f"""{greeting} This is {STUDIO_NAME}. 

We noticed your interest in modeling opportunities! 🌟

We're currently booking FREE assessment shoots for new faces. These are quick 20-min sessions where we evaluate your potential and discuss opportunities.

Interested in learning more?

Reply STOP to opt out."""


# Enhanced objection handling templates
OBJECTION_RESPONSES = {
    "distance": [
        "I hear you! Here's the thing: 90% of our professional models started by traveling to us. The best opportunities are worth the journey! 🚀",
        "Most of our top earners come from outside London. This is where the industry is! Plus, it's just one trip for the assessment. Worth it?",
        "Great question! The assessment is in London, but once you're on our books, we often come to YOU for shoots. One trip opens many doors! 🚪",
    ],
    
    "busy": [
        "I totally get it! That's exactly why we keep them to just 20 minutes. We have slots throughout the week - even evenings. What day works best?",
        "No worries! Our assessment shoots are super quick - just 20 mins. We can work around your schedule. Morning or evening person?",
    ],
    
    "cost": [
        "Great question! The assessment shoot is completely FREE. Zero cost. It's our way of discovering new talent. Sound good?",
        "It's FREE! 🎉 No charge for the assessment. We invest in finding the right faces. If we're a good match, we can discuss representation after. Fair?",
    ],
    
    "experience": [
        "Perfect! 90% of pros started exactly where you are. We actually PREFER working with fresh faces - no bad habits to unlearn! 😊",
        "Even better! We train from scratch. Natural look + good attitude = perfect combo. That's what the assessment is for! You in?",
    ],
    
    "nervous": [
        "That's completely normal! Every model feels that way at first. Our team will guide you through everything. It's a friendly, no-pressure chat. Promise! 🤝",
        "I get it! But here's the secret: 90% of our pros were nervous at their first assessment too. Now they're crushing it. You've got this!",
    ],
    
    "thinking": [
        "Totally understand! Quick heads up though - we only have a few slots left this week. I can hold one for you for 24 hours if that helps?",
        "Of course! What specific questions can I answer? Just so you know, spots fill up fast. Want me to pencil you in while you decide?",
    ],
    
    "stop": [
        "No problem at all! You've been removed from our list. Best of luck with everything! 👋",
        "Understood! You won't hear from us again. Wishing you all the best!",
    ]
}


# Mock calendar slots (replace with real calendar API in production)
MOCK_CALENDAR_SLOTS = [
    "Tomorrow at 2:00 PM",
    "Thursday at 11:00 AM",
    "Friday at 4:30 PM",
    "Saturday at 10:00 AM",
    "Next Monday at 3:00 PM",
]


def get_calendar_slots(num_slots: int = 3) -> list[str]:
    """
    Get available calendar slots for booking.
    This is a mock implementation - replace with real calendar API.
    
    Args:
        num_slots: Number of slots to return
        
    Returns:
        list[str]: Available time slots
    """
    return MOCK_CALENDAR_SLOTS[:num_slots]


def format_slots_message(slots: list[str]) -> str:
    """
    Format calendar slots into a friendly SMS message.
    
    Args:
        slots: List of available time slots
        
    Returns:
        str: Formatted message with slots
    """
    if not slots:
        return "Let me check our calendar and get back to you with some times!"
    
    slots_text = "\n".join([f"{i+1}. {slot}" for i, slot in enumerate(slots)])
    return f"Brilliant! Here are some available slots:\n\n{slots_text}\n\nWhich works best? Just reply with the number!"


def get_booking_confirmation(slot: str, lead_name: str = None) -> str:
    """
    Generate booking confirmation message.
    
    Args:
        slot: Confirmed time slot
        lead_name: Lead's name
        
    Returns:
        str: Confirmation message
    """
    name_part = f"{lead_name}, you're" if lead_name else "You're"
    
    return f"""Perfect! {name_part} all set for {slot}! 🎉

Location: {STUDIO_NAME}
Duration: 20 minutes
Cost: FREE

You'll receive a confirmation email shortly with the full address and what to bring.

Excited to meet you! Any questions before then?"""


def get_qualification_questions() -> list[str]:
    """
    Get qualification questions to ask leads.
    
    Returns:
        list[str]: Qualification questions
    """
    return [
        "Awesome! Quick question - what are your modeling goals? Fashion, commercial, editorial? 📸",
        "Have you done any modeling work before, or is this your first step into it?",
        "Where are you based? Just so I can suggest the best times for you!",
        "What's your availability like? We have slots throughout the week, including evenings.",
    ]
