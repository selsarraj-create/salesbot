from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .test_chat import test_chat_handler

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Explicitly register the route function from test_chat
app.post("/api/test_chat")(test_chat_handler)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Handler for Vercel
handler = app
