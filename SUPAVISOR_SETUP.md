# Supavisor Connection Pooling Setup

## Overview

This project uses **Supavisor** (Supabase's connection pooler) on **Port 6543** in **Transaction Mode** to handle database connections efficiently in Vercel's serverless environment.

## Why Supavisor?

Vercel serverless functions create new instances for each request, which can quickly exhaust PostgreSQL connection limits. Supavisor solves this by:

1. **External Connection Pooling**: Manages connections outside your application
2. **Transaction Mode (Port 6543)**: Each transaction gets a connection, then releases it
3. **No Local Pooling**: FastAPI uses `NullPool` - Supavisor handles all pooling

## Configuration

### 1. Database Connection String

Format for Supavisor Transaction Mode (Port 6543):
```
postgresql://postgres:{PASSWORD}@db.{PROJECT_REF}.supabase.co:6543/postgres
```

**Components**:
- `{PROJECT_REF}`: Your Supabase project reference (e.g., `xcqqntvniitgmrhxkgya`)
- `{PASSWORD}`: Your database password
- `6543`: Transaction Mode port

**Example**:
```
postgresql://postgres:your-password@db.xcqqntvniitgmrhxkgya.supabase.co:6543/postgres
```

### 2. SQLAlchemy Engine Settings

```python
from sqlalchemy import create_engine, pool

engine = create_engine(
    connection_string,
    poolclass=pool.NullPool,  # No local pooling
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"
    },
    execution_options={
        "statement_cache_size": 0  # Disable caching
    }
)
```

**Key Settings**:
- `poolclass=NullPool`: Disables SQLAlchemy's connection pooling
- `statement_cache_size=0`: Disables statement caching for serverless
- `connect_timeout=10`: 10-second connection timeout
- `statement_timeout=30000`: 30-second query timeout

## Environment Variables

Add to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-supabase-service-key
SUPABASE_DB_PASSWORD=your-database-password  # NEW: For SQLAlchemy
```

### Getting Your Database Password

1. Go to Supabase Dashboard
2. Settings → Database
3. Copy the password (or reset if needed)

## Vercel Deployment

Add environment variables in Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_DB_PASSWORD` ← **Important for Supavisor**

## Port Comparison

| Port | Mode | Use Case |
|------|------|----------|
| 5432 | Direct | Local development, long-running servers |
| 6543 | Transaction | **Serverless (Vercel, Lambda)** ← We use this |
| 5432 | Session | Persistent connections, connection pooling apps |

## Testing Connection

```python
from api.utils.supabase_client import test_sqlalchemy_connection

# Test Supavisor connection
if test_sqlalchemy_connection():
    print("✅ Supavisor connection successful")
else:
    print("❌ Connection failed")
```

## Benefits for Vercel

✅ **No Connection Exhaustion**: Supavisor manages pooling externally  
✅ **Fast Cold Starts**: No local pool initialization  
✅ **Scalable**: Handles thousands of concurrent serverless functions  
✅ **Automatic Cleanup**: Connections released after each transaction  

## Troubleshooting

### "Too many connections" error

- ✅ Verify you're using port **6543** (not 5432)
- ✅ Check `poolclass=NullPool` is set
- ✅ Confirm `SUPABASE_DB_PASSWORD` is correct

### Connection timeout

- Increase `connect_timeout` in `connect_args`
- Check Supabase region matches your connection string
- Verify network connectivity from Vercel

### Region-Specific Pooler URLs

Adjust the pooler URL based on your Supabase region:

- **US East**: `aws-0-us-east-1.pooler.supabase.com`
- **EU West**: `aws-0-eu-west-1.pooler.supabase.com`
- **AP Southeast**: `aws-0-ap-southeast-1.pooler.supabase.com`

Find your region in Supabase Dashboard → Settings → General

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supavisor GitHub](https://github.com/supabase/supavisor)
- [SQLAlchemy NullPool](https://docs.sqlalchemy.org/en/20/core/pooling.html#sqlalchemy.pool.NullPool)

---

**Summary**: Port 6543 + NullPool + Supavisor = Perfect for Vercel serverless! 🚀
