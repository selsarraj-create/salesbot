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
        # Minimal Isolation Test
        print("Hello World Debug")
        return {
            "success": True,
            "response": "DEBUG: Sandbox is online. If you see this, the Vercel setup is fixed and the error is in the logic/imports.",
            "status": "Debug",
            "analysis": {}
        }

    except Exception as e:
        print(f"Sandbox Error: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

# Vercel entry point (Native)
handler = app
