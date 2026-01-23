from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import time
import os
from dotenv import load_dotenv

# Imports moved inside handler to prevent top-level initialization errors
# from .utils.gemini_client import get_gemini_agent
# from .utils.supabase_client import get_supabase_client
# from .utils.lead_manager import (
#     save_message,
#     get_messages_with_retry,
#     verify_message_saved,
#     update_lead_status
# )

load_dotenv()

app = FastAPI()

@app.post("/api/sandbox")
async def sandbox_handler(request: Request):
    """
    Sandbox chat endpoint.
    Uses the REAL Gemini agent and Supabase logic.
    """
    try:
        # Lazy imports to ensure module loads successfully even if dependencies fail initially
        from .utils.gemini_client import get_gemini_agent
        from .utils.supabase_client import get_supabase_client
        from .utils.lead_manager import (
            save_message,
            get_messages_with_retry,
            verify_message_saved,
            update_lead_status
        )

        data = await request.json()
        lead_id = data.get("lead_id")
        message = data.get("message")
        simulate_latency = data.get("simulate_latency", False)

        if not lead_id or not message:
            raise HTTPException(status_code=400, detail="Missing lead_id or message")

        print(f"Sandbox: Lead {lead_id} message: {message}")

        # 1. Get Lead Details
        supabase = get_supabase_client()
        lead_response = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead = lead_response.data
        lead_name = lead.get("name")
        current_status = lead.get("status", "New")

        # 2. Save User Message
        msg_data = {
            "lead_id": lead_id,
            "content": message,
            "sender_type": "lead",
            "metadata": {"is_test": True}
        }
        res = supabase.table("messages").insert(msg_data).execute()
        
        # 3. Simulate Latency (Thinking)
        if simulate_latency:
            import random
            await asyncio.sleep(random.uniform(1.0, 3.0))
        else:
             # Small delay for DB propagation
             time.sleep(0.5)

        # 4. Get Message History
        history_response = supabase.table("messages").select("*").eq("lead_id", lead_id).order("timestamp", desc=False).execute()
        message_history = history_response.data or []
        
        # 5. Analyze & Generate Response
        agent = get_gemini_agent()
        analysis = agent.analyze_message(message, current_status)
        
        # Update status logic (mirroring webhook)
        new_status = current_status
        if analysis.get("objection_type") == "distance":
            new_status = "Objection_Distance"
        elif analysis.get("intent") == "booking":
             new_status = "Booking_Offered"
             
        if new_status != current_status:
            supabase.table("leads").update({"status": new_status}).eq("id", lead_id).execute()

        # Generate Contextual Response
        response_text = agent.generate_response(
            message, 
            message_history, 
            lead_name=lead_name, 
            lead_status=new_status, 
            analysis_dict=analysis
        )

        # 6. Save Bot Response
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
        print(f"Sandbox Error: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

# Vercel entry point
handler = app
