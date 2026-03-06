"""
Unified FastAPI application for Railway deployment.
Combines webhook, manual message, and takeover endpoints with CORS support.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WhatsApp Sales Bot", version="3.0.0")

# CORS — allow Vercel dashboard to call Railway backend
ALLOWED_ORIGINS = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

# Add any additional origins from env
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    ALLOWED_ORIGINS.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register route handlers
from api.webhook import router as webhook_router
from api.manual_message import router as manual_message_router
from api.toggle_takeover import router as toggle_takeover_router

app.include_router(webhook_router)
app.include_router(manual_message_router)
app.include_router(toggle_takeover_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "WhatsApp Sales Bot", "version": "3.0.0"}
