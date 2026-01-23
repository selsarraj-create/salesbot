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

**Distance**: "90% of our pros started by traveling to us. It's a rare chance to get feedback from a top London management team. Worth the trip for the experience alone!"

**Busy**: "Totally fine. Slots go fast though. I'd suggest grabbing a time now just to secure it - you can always change it later if you need to. Saturday 10 AM?"

**Cost**: "The assessment is 100% FREE. No booking fee. Some come just for the confidence boost or to try something new. Zero risk. Saturday 2 PM?"

**Nervous**: "Most of our best faces were nervous! We're looking for 'Real People' to represent real brands. Authentic is better than polished. You'll be great!"

**Thinking**: "No problem. But these Saturday slots will be gone by tonight. Why not pencil in 2 PM now? If you decide against it later, just let me know."

**Experience (Too much)**: "Quick check - have you done a professional test shoot with another agency in the last 6 months?" (If YES: Disqualify gently).

BOOKING FLOW:
1. They show interest → "Nice surprise! Your look actually caught our team's eye."
2. They mention a day → Offer 2 specific times
3. They pick a time → Confirm and close
4. They're vague → Pivot to "Side Hustle": "It's a great side hustle to earn extra cash alongside work/study."

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

IMPORTANT - WHAT TO BRING:
1. Blue jeans & white T-shirt/shirt (Required)
2. Two other outfits that show your personality 👗👔
3. Clean hair & natural makeup (if any)

You'll receive a confirmation email shortly with the full address.

Excited to meet you! Any questions before then?"""


def get_qualification_questions() -> list[str]:
    """
    Get qualification questions to ask leads.
    
    Returns:
        list[str]: Qualification questions
    """
    return [
        "Awesome! Quick question - what are your modeling goals? Fashion, commercial, editorial? 📸",
        "Have you done any modeling work before? (Specifically, have you had a test shoot with another agency in the last 6 months?)",
        "And just for our notes - do you know your approximate height and measurements? (Don't worry if not exact!)",
        "Where are you based? Just so I can suggest the best times for you!",
        "What's your availability like? We have slots throughout the week, including evenings.",
    ]


# Knowledge base from FAQs
FAQ_RESPONSES = {
    "clothes": "Bring 3 looks: 1) Blue jeans + white T-shirt (classic look). 2) Two personality outfits! 👗 Check our Welcome Pack for ideas: https://edgetalent.co.uk/welcomepack",
    "portfolio": "No portfolio needed! That's what the assessment is for. If you match a category, we might not even need one. Let's see how you do first! 📸",
    "sell": "No pressure at all! The assessment is 100% FREE. It's just to see if you have potential. If you like the photos, you can buy them, but no obligation. 👍",
    "hard_sell": "No pressure at all! The assessment is 100% FREE. It's just to see if you have potential. If you like the photos, you can buy them, but no obligation. 👍",
    "deposit": "No deposit! Unlike other studios, we don't charge a booking fee. We invite people we believe in. Ready to book? 📅",
    "scam": "I totally get the caution! We're a legitimate studio looking for new faces. The assessment is completely free, so there's zero risk for you to come check it out.",
    "makeup": "Keep it natural! We want to see the real you. Clean hair and light/no makeup is best for the assessment. ✨",
    "someone_else": "Absolutely! We actually ENCOURAGE you to bring a parent or friend. They can wait in our reception area while you shoot. 🛋️",
    "pack": "Check out our Welcome Pack for full details on what to bring and expect: https://edgetalent.co.uk/welcomepack 📖"
}
