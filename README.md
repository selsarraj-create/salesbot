# Full-Stack WhatsApp Sales Bot & Real-Time Dashboard

Production-grade WhatsApp conversational AI sales bot with real-time monitoring dashboard. Built with Next.js, FastAPI, Gemini 3 Pro, and Supabase Realtime.

## 🎯 Features

### AI Sales Bot
- **Gemini 3 Pro Reasoning**: Intelligent objection handling with "thinking" mode
- **Senior Studio Manager Persona**: Professional, high-energy sales approach
- **Distance Objection Handling**: "90% of pros started here" rebuttal strategy
- **Status-Based Workflow**: New → Qualifying → Booking_Offered → Booked
- **UK WhatsApp Compliance**: Studio name and STOP opt-out in all messages
- **Rich Messaging**: Up to 4,096 characters per message (vs 160 for SMS)

### Real-Time Dashboard
- **Live Lead Monitoring**: Color-coded sidebar with real-time status updates
- **Streaming Chat**: View AI conversations as they happen
- **Manual Takeover**: Pause AI and send messages as human agent
- **Analytics**: Metrics with lead code filtering (#FB2024, #IG2024, etc.)
- **Supabase Realtime**: Sub-second updates without polling

> **Note**: This bot uses Twilio's WhatsApp API for messaging. WhatsApp provides better reach in the UK market (~95% smartphone penetration) and supports longer, richer messages.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Leads     │  │     Chat     │  │   Metrics    │  │
│  │   Sidebar    │  │    Window    │  │    Panel     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                   Supabase Realtime                      │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                     │
│              leads table | messages table                │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (Vercel)                    │
│  /api/webhook | /api/manual_message | /api/toggle_takeover│
└─────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│Twilio WhatsApp│                    │  Gemini 3    │
│   Gateway    │                    │     Pro      │
└──────────────┘                    └──────────────┘
```

## 📋 Prerequisites

- **Vercel Account**: For Next.js + API deployment
- **Supabase Account**: For PostgreSQL + Realtime
- **Twilio Account**: With WhatsApp Sender configured
- **Google AI API Key**: For Gemini 3 Pro

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### 2. Set Up Supabase Database

1. Create a new Supabase project
2. Run migrations in SQL Editor:
   - `supabase/migrations/001_create_leads_table.sql`
   - `supabase/migrations/002_create_messages_table.sql`
3. **Enable Realtime**:
   - Go to Database → Replication
   - Enable replication for `messages` table
   - Enable replication for `leads` table

### 3. Configure Environment Variables

Create `.env` file:

```env
# Supabase (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key

# Supabase (Frontend - Public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+447700900000

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Studio Info
STUDIO_NAME=London Photography Studio
STUDIO_PHONE=+447700900000
```

### 4. Test Locally

```bash
# Run Next.js development server
npm run dev

# In another terminal, test the API (simulating WhatsApp webhook format)
curl -X POST http://localhost:3000/api/webhook \
  -d "From=whatsapp:+447700900000" \
  -d "Body=Hi, I'm interested in modeling" \
  -d "MessageSid=test123"
```

Open http://localhost:3000 to view the dashboard.

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard
# Settings → Environment Variables → Add all from .env
```

### 6. Configure Twilio WhatsApp Sender

1. Twilio Console → Messaging → WhatsApp Senders
2. Connect your WhatsApp-enabled number (or use Sandbox for testing)
3. Set incoming webhook URL:
   ```
   https://your-app.vercel.app/api/webhook
   ```
4. HTTP Method: `POST`
5. Save

## 📁 Project Structure

```
d:/SALESBOT/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Dashboard page
│   ├── globals.css              # Global styles
│   └── components/
│       ├── LeadsSidebar.tsx     # Color-coded lead list
│       ├── ChatWindow.tsx       # Real-time chat + takeover
│       └── MetricsPanel.tsx     # Analytics dashboard
├── lib/
│   └── supabase/
│       ├── client.ts            # Supabase browser client
│       └── types.ts             # TypeScript types
├── api/                          # FastAPI backend
│   ├── webhook.py               # Twilio WhatsApp webhook
│   ├── manual_message.py        # Manual messaging endpoint
│   ├── toggle_takeover.py       # Takeover control
│   └── utils/
│       ├── supabase_client.py   # Database connection
│       ├── gemini_client.py     # AI integration
│       ├── lead_manager.py      # Lead CRUD
│       └── sales_prompts.py     # Conversation logic
├── supabase/migrations/         # Database schema
├── package.json                 # Node dependencies
├── requirements.txt             # Python dependencies
├── vercel.json                  # Deployment config
└── README.md
```

## 🎨 Dashboard Features

### Color-Coded Lead Status

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Booked | Green | Confirmed booking |
| 🔵 Booking_Offered | Blue | Slots presented |
| 🟡 Qualifying | Yellow | AI qualifying lead |
| 🟠 Objection_Distance | Orange | Distance objection detected |
| 🔴 Human_Required | Red | Needs human intervention |
| ⚪ New | Gray | First contact |

### Manual Takeover Workflow

1. Click "🔒 Takeover" button in chat window
2. AI pauses for this lead
3. Manual message input appears
4. Send messages as human agent
5. Click "🔓 Release" to resume AI

### Metrics & Analytics

- **Total Leads**: All leads in system
- **Total Bookings**: Leads with status = Booked
- **Conversion Rate**: Bookings / Total Leads
- **Filter by Lead Code**: View metrics for specific campaigns (#FB2024, etc.)
- **Status Breakdown**: Visual distribution of lead statuses

## 🤖 AI Conversation Flow

### Status Progression

```
New → Qualifying → Booking_Offered → Booked
  ↓         ↓
Objection_Distance → Human_Required
```

### Objection Handling

**Distance/Too Far**:
- Detects keywords: "far", "distance", "travel", "location"
- Sets status to `Objection_Distance`
- Uses "90% of pros started by traveling to us" rebuttal
- Emphasizes: One trip for assessment, then we come to them

**Other Objections**:
- Cost → "Assessment is FREE"
- Experience → "We prefer fresh faces"
- Busy → "Just 20 minutes, flexible scheduling"
- Nervous → "90% of pros were nervous at first"

### Qualification Questions

- "What are your modeling goals?"
- "Have you done any modeling before?"
- "Where are you based?"
- "What's your availability like?"

## 🔧 API Endpoints

### POST /api/webhook
Twilio WhatsApp webhook. Receives incoming messages, processes with AI, returns TwiML response.

**Request** (from Twilio):
```
From: whatsapp:+447700900000
Body: "I'm interested but you're too far"
MessageSid: SM1234567890
```

**Response** (TwiML):
```xml
<Response>
  <Message>90% of our professional models started by traveling to us! The best opportunities are worth the journey. 🚀</Message>
</Response>
```

### POST /api/manual_message
Send manual message from dashboard.

**Request**:
```json
{
  "lead_id": "uuid-here",
  "message": "Hi, this is Sarah from the studio!"
}
```

**Response**:
```json
{
  "success": true,
  "message_sid": "SM1234567890"
}
```

### POST /api/toggle_takeover
Enable/disable manual mode.

**Request**:
```json
{
  "lead_id": "uuid-here",
  "enabled": true
}
```

**Response**:
```json
{
  "success": true,
  "is_manual_mode": true
}
```

## 📊 Database Schema

### `leads` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phone | TEXT | E.164 format, unique |
| name | TEXT | Lead's name (nullable) |
| lead_code | TEXT | Unique code with # prefix |
| status | TEXT | Enum: New, Qualifying, Booking_Offered, Booked, Objection_Distance, Human_Required |
| is_manual_mode | BOOLEAN | True when human has taken over |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

### `messages` Table (Realtime Enabled)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lead_id | UUID | Foreign key to leads |
| content | TEXT | Message text |
| sender_type | TEXT | 'bot', 'lead', or 'human' |
| timestamp | TIMESTAMP | Auto-generated |

## 🧪 Testing

### Test WhatsApp Flow

```bash
# Send test WhatsApp message to your Twilio number
# Expected: AI responds with qualification questions

# Test distance objection
# Send: "I'm interested but you're too far"
# Expected: "90% of pros" rebuttal, status → Objection_Distance
```

### Test Dashboard

1. Open http://localhost:3000
2. Send WhatsApp message to Twilio number
3. Verify lead appears in sidebar
4. Click lead to view conversation
5. Test takeover button
6. Send manual message
7. Check metrics update in real-time

### Test Realtime

1. Open dashboard in two browser windows
2. Send WhatsApp message from your phone
3. Verify message appears in both windows instantly

## 🚨 Troubleshooting

### "Realtime not working"

- Verify Realtime is enabled in Supabase Dashboard (Database → Replication)
- Check browser console for connection errors
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### "Manual message fails"

- Verify lead is in manual mode (`is_manual_mode = true`)
- Check `TWILIO_PHONE_NUMBER` is set to a WhatsApp-enabled number
- Ensure Twilio credentials are valid
- Verify WhatsApp Sender is properly configured in Twilio Console

### "AI not responding"

- Check `GEMINI_API_KEY` is valid
- Verify Gemini API quota in Google AI Studio
- Check Vercel function logs for errors

## 💰 Cost Considerations

- **Gemini 3 Pro**: Reasoning mode may incur higher costs
- **Vercel**: 30s timeout may increase function costs
- **Supabase**: Realtime connections count toward plan limits
- **Twilio**: WhatsApp messages ~$0.004 per message (10x cheaper than SMS)

## 📚 Documentation

- [Implementation Plan](./implementation_plan.md)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Twilio SMS API](https://www.twilio.com/docs/sms)

## 🔐 Security

- Never commit `.env` file
- Use Supabase Service Key for backend, Anon Key for frontend
- Implement Row Level Security in production
- Add Twilio request signature validation

---

**Built with ❤️ for converting leads into bookings**
