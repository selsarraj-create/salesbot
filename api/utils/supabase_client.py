"""
Supabase client configuration and connection management.
Optimized for Vercel serverless with Supavisor connection pooling (Port 6543).
"""

import os
from typing import Optional
from supabase import create_client, Client
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global client instances
_supabase_client: Optional[Client] = None
_sqlalchemy_engine: Optional[Engine] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses singleton pattern to reuse connection across requests.
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        ValueError: If required environment variables are missing
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "Missing required environment variables: SUPABASE_URL and SUPABASE_KEY"
            )
        
        _supabase_client = create_client(supabase_url, supabase_key)
    
    return _supabase_client


def get_sqlalchemy_engine() -> Engine:
    """
    Get or create SQLAlchemy engine for direct database access.
    Configured for Vercel serverless with Supavisor (Port 6543, Transaction Mode).
    
    Configuration:
    - Port 6543: Supavisor Transaction Mode
    - poolclass=NullPool: No local connection pooling (Supavisor handles it)
    - statement_cache_size=0: Disable statement caching for serverless
    
    Returns:
        Engine: SQLAlchemy engine instance
        
    Raises:
        ValueError: If required environment variables are missing
    """
    global _sqlalchemy_engine
    
    if _sqlalchemy_engine is None:
        # Get Supabase connection details
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_password = os.getenv("SUPABASE_DB_PASSWORD")
        
        if not supabase_url or not supabase_password:
            raise ValueError(
                "Missing required environment variables: SUPABASE_URL and SUPABASE_DB_PASSWORD"
            )
        
        # Extract project reference from Supabase URL
        # Format: https://xxxxx.supabase.co -> xxxxx
        project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
        
        # Build connection string for Supavisor (Port 6543, Transaction Mode)
        # Format: postgresql://postgres:{password}@db.{ref}.supabase.co:6543/postgres
        connection_string = (
            f"postgresql://postgres:{supabase_password}"
            f"@db.{project_ref}.supabase.co:6543/postgres"
        )
        
        # Create engine with Vercel-optimized settings
        _sqlalchemy_engine = create_engine(
            connection_string,
            poolclass=pool.NullPool,  # No local pooling - Supavisor handles it
            connect_args={
                "connect_timeout": 10,
                "options": "-c statement_timeout=30000"  # 30s timeout
            },
            execution_options={
                "statement_cache_size": 0  # Disable statement caching
            }
        )
    
    return _sqlalchemy_engine


def test_connection() -> bool:
    """
    Test Supabase connection by attempting a simple query.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        client = get_supabase_client()
        # Try to query leads table (will return empty if no data)
        client.table("leads").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"Supabase connection test failed: {e}")
        return False


def test_sqlalchemy_connection() -> bool:
    """
    Test SQLAlchemy engine connection.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        engine = get_sqlalchemy_engine()
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            result.fetchone()
        return True
    except Exception as e:
        print(f"SQLAlchemy connection test failed: {e}")
        return False
