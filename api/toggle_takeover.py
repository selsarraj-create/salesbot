"""
Takeover control endpoint for enabling/disabling manual mode.
Allows dashboard users to pause AI and take over conversations.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .utils.lead_manager import set_manual_mode, get_lead_by_id

app = FastAPI()


class TakeoverRequest(BaseModel):
    lead_id: str
    enabled: bool


@app.post("/api/toggle_takeover")
async def toggle_takeover(request: TakeoverRequest):
    """
    Enable or disable manual takeover mode for a lead.
    When enabled, AI responses are paused and human agent can send messages.
    
    Args:
        request: Contains lead_id and enabled flag
        
    Returns:
        dict: Success status and current takeover state
    """
    try:
        # Verify lead exists
        lead = get_lead_by_id(request.lead_id)
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Update manual mode
        success = set_manual_mode(request.lead_id, request.enabled)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update manual mode")
        
        return {
            "success": True,
            "lead_id": request.lead_id,
            "is_manual_mode": request.enabled,
            "message": f"Manual mode {'enabled' if request.enabled else 'disabled'}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling takeover: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For Vercel serverless deployment
handler = app
