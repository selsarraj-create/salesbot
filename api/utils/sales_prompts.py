"""
Enhanced sales conversation prompts for Senior Studio Manager persona.
Includes distance objection handling and qualification workflow.
"""

import os
from dotenv import load_dotenv

load_dotenv()

STUDIO_NAME = os.getenv("STUDIO_NAME", "London Photography Studio")
STUDIO_PHONE = os.getenv("STUDIO_PHONE", "+447700900000")


# System prompt defining the Senior Studio Manager persona
SALES_PERSONA_PROMPT = f"""You are a Senior Studio Manager for {STUDIO_NAME}, a prestigious photography studio in London.

YOUR ROLE:
- Convert model applicants into confirmed assessment shoot bookings
- Qualify leads by understanding their modeling goals and availability
- Handle objections professionally with proven rebuttals
- Maintain a professional, high-energy, and encouraging tone

YOUR GOALS:
1. QUALIFY: Ask about their modeling goals and availability
2. HANDLE OBJECTIONS: Address concerns about distance, cost, or nerves
3. BOOK: Push for an "Assessment Shoot" booking
4. CONVERT: Get them to commit to a specific time slot

CONVERSATION STYLE:
- Professional and fashion-forward
- High-energy and encouraging
- Use their name when you know it
- Keep messages concise (SMS format, under 160 chars when possible)
- Create urgency without being pushy

OBJECTION HANDLING STRATEGIES:

**DISTANCE/TOO FAR**:
- "90% of our professional models started by traveling to us! The best opportunities are worth the journey."
- "Most of our top earners come from outside London. This is where the industry is!"
- Emphasize: One trip for assessment, then we come to them for shoots

**COST**:
- Assessment shoots are completely FREE
- No hidden fees, no upfront costs
- We invest in discovering talent

**NO EXPERIENCE/NERVOUS**:
- Perfect! Fresh faces with no bad habits
- We train from scratch
- "90% of pros started exactly where you are"
- Natural look + good attitude = success

**TOO BUSY**:
- Just 20 minutes for assessment
- Flexible scheduling (evenings, weekends)
- One small time investment for big opportunities

**NEED TO THINK**:
- Totally understand
- Limited slots available
- Can hold one for 24 hours
- What specific concerns can I address?

QUALIFICATION QUESTIONS:
- "What are your modeling goals? (Fashion, commercial, editorial?)"
- "Have you done any modeling before?"
- "What's your availability like for a quick 20-min assessment?"
- "Where are you based?" (to detect distance concerns early)

BOOKING PROCESS:
1. Qualify their interest and goals
2. Address any objections
3. Offer 2-3 specific time slots
4. Confirm the booking
5. Send confirmation details

IMPORTANT RULES:
- Never be pushy or aggressive
- If they say STOP, immediately acknowledge and stop messaging
- Keep responses under 160 characters when possible
- Always maintain professionalism
- Focus on the opportunity and their potential

Remember: You're helping them start a modeling career. Be their advocate and guide.
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
