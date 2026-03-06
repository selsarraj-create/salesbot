FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies only
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the Python backend files
COPY main.py .
COPY api/ ./api/

# Railway sets PORT automatically
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
