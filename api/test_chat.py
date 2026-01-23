from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import time
import os
import asyncio
from dotenv import load_dotenv

# Import shared logic (same as webhook.py)
from .utils.gemini_client import get_gemini_agent
from .utils.lead_manager import (
    save_message,
    get_messages_with_retry,
    verify_message_saved,
    update_lead_status
)

load_dotenv()

app = FastAPI()

@app.post("/api/test_chat")
async def test_chat_handler(request: Request):
    """
    Test chat endpoint for the Sandbox.
    Uses the REAL Gemini agent and Supabase logic.
    """
    try:
        data = await request.json()
        lead_id = data.get("lead_id")
        message = data.get("message")
        simulate_latency = data.get("simulate_latency", False)

        if not lead_id or not message:
            raise HTTPException(status_code=400, detail="Missing lead_id or message")

        print(f"Test Chat: Lead {lead_id} message: {message}")

        # 1. Save Lead Message
        # We need the phone to track history efficiently in lead_manager patterns, 
        # but here we have ID. 'save_message' expects phone usually?
        # Let's check lead_manager.py signature.
        # save_message(identifier, sender_type, content) -> usually identifier is phone.
        # But if we pass ID, we need to ensure lead_manager handles it OR we fetch the phone first.
        # Actually, let's fetch the lead to get the phone/name for consistency.
        
        from .utils.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        lead_response = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead = lead_response.data
        phone = lead.get("phone") or f"test_{lead_id}" # Fallback if no phone
        lead_name = lead.get("name")
        current_status = lead.get("status", "New")

        # Save to DB (using helper which handles 'is_test' logic if embedded, 
        # but here we just want to save raw message for history)
        # Note: save_message in lead_manager might expect phone. 
        # Let's verify save_message.py later? 
        # For safety, I'll use supabase direct insert for the test chat to avoid side-effects 
        # (like triggering real SMS if logic is mixed).
        # BUT we want the history for the AI.
        
        # Insert Lead Message
        msg_data = {
            "lead_id": lead_id,
            "content": message,
            "sender_type": "lead",
            "metadata": {"is_test": True}
        }
        res = supabase.table("messages").insert(msg_data).execute()
        message_id = res.data[0]['id'] if res.data else None
        
        # Verify saved (important for AI context)
        if message_id:
             # retry a few times to ensure visibility
             pass 

        # 2. Simulate Latency (Thinking)
        if simulate_latency:
            # Sleep 1-3 seconds
            import random
            await asyncio.sleep(random.uniform(1.0, 3.0))

        # 3. Get AI Response
        # Fetch history
        # We can use the helper get_messages_with_retry but using the LEAD ID if possible?
        # get_messages typically filters by lead_id or phone.
        # Let's manually fetch for safety in this test endpoint to be robust.
        
        time.sleep(0.5) # Wait for propagation
        
        history_response = supabase.table("messages").select("*").eq("lead_id", lead_id).order("timestamp", desc=False).execute()
        message_history = history_response.data or []
        
        # Analyze & Generate
        agent = get_gemini_agent()
        
        # Analysis (lite version for test)
        analysis = agent.analyze_message(message, current_status)
        
        # Update status if needed (optional for test, but good for realism)
        new_status = current_status
        if analysis.get("objection_type") == "distance":
            new_status = "Objection_Distance"
        elif analysis.get("intent") == "booking":
             new_status = "Booking_Offered"
             
        # Update status in DB
        if new_status != current_status:
            supabase.table("leads").update({"status": new_status}).eq("id", lead_id).execute()

        # Generate Response
        response_text = agent.generate_response(
            message, 
            message_history, 
            lead_name=lead_name, 
            lead_status=new_status, 
            analysis_dict=analysis
        )

        # 4. Save Bot Response
        bot_msg_data = {
            "lead_id": lead_id,
            "content": response_text,
            "sender_type": "bot",
            "metadata": {"is_test": True}
        }
        supabase.table("messages").insert(bot_msg_data).execute()

        return {
            "success": True,
            "response": response_text,
            "status": new_status,
            "analysis": analysis
        }

    except Exception as e:
        print(f"Test Chat Error: {str(e)}")
        # Return proper JSON error that frontend expects
        return JSONResponse(status_code=500, content={"detail": str(e)})

# Vercel entry point
handler = app
