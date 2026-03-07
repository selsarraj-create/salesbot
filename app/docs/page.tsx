'use client';

import AppShell from '../components/AppShell';

const SECTIONS = [
    {
        id: 'dashboard',
        icon: '📊',
        title: 'Dashboard',
        content: `The Dashboard is your home base. It shows **live conversations** between your AI assistant and real leads.

**Conversations View (default)**
- The left sidebar lists all your real leads, sorted by priority
- Click a lead to view the full conversation in the main panel
- Use the takeover toggle to switch a lead to manual mode if you want to reply yourself

**Analytics View**
- Click the **📊 Analytics** button in the top bar to switch to the analytics dashboard
- **AI Performance** — Shows your booking rate, average response time, cost per lead, cost per booking, and number of human handoffs
- **Conversion Funnel** — Visual breakdown of leads from New → Qualifying → Booking Offered → Booked
- **Recent Bookings** — Feed of your most recently booked leads
- **Why They Didn't Book** — Analysis of non-booked leads: ghosted, distance objection, human required, etc.

> **Note:** Test leads from the Sandbox are excluded from all analytics and the conversation sidebar. Only real leads appear here.`,
    },
    {
        id: 'sandbox',
        icon: '📥',
        title: 'Sandbox',
        content: `The Sandbox is your safe testing environment. Use it to see how the AI responds to different lead scenarios **without affecting real data**.

**Creating a Test Lead**
- Fill in a name, phone number, and optional context
- The AI will treat this as a real conversation, but it's flagged as a test
- Test leads won't appear in your Dashboard, analytics, or training queue

**Flight Simulator**
- Run pre-built scenarios to stress-test your AI
- See how it handles objections, pricing questions, or tricky situations
- Great for onboarding new team members to see the AI in action`,
    },
    {
        id: 'command-center',
        icon: '⚡',
        title: 'Command Center',
        content: `The Command Center is where you configure and improve your AI assistant.

**Training Queue**
- Review the AI's recent responses to real leads
- Approve good responses (✅), mark gold-standard examples (⭐), or provide corrections
- Your feedback directly improves how the AI responds in future conversations

**Knowledge Base**
- Upload documents, call transcripts, or FAQs that the AI should know about
- The AI uses this knowledge to answer questions about your business, pricing, services, etc.
- Supported formats: text documents, audio transcripts

**System Rules**
- Set behavioral rules the AI must follow (e.g., "Always mention our studio is wheelchair accessible")
- Set constraints (e.g., "Never offer discounts over 20%")

**AI Configuration**
- Adjust response style: temperature (creativity), thinking budget, etc.
- Toggle "full context mode" to give the AI more conversation history

**Simulations**
- Create custom scenarios with specific lead personas
- Test the AI against difficult situations before going live`,
    },
    {
        id: 'settings',
        icon: '⚙️',
        title: 'Settings',
        content: `Manage your account and configure integrations.

**Business Profile**
- **Business Name** — Displayed in the dashboard header
- **Chatbot Name** — The name your AI uses when talking to leads (e.g., "Alex")
- **Email** — Your account email
- **Monthly Ad Spend (£)** — Set your monthly advertising budget; this is used to calculate cost per lead and cost per booking on the Analytics dashboard

**Quiet Hours**
- Set a start and end time during which the AI will **not send any live messages** to leads
- Choose your timezone so the schedule is accurate for your location
- **Sandbox is not affected** — you can test freely during quiet hours
- Click **Disable Quiet Hours** to turn the feature off entirely
- Example: Set 21:00 → 08:00 to pause all outbound messages overnight

**Change Password**
- Update your account password

**CRM Integration**
- Connect any CRM to automatically pipe leads into the system — see the CRM Integration section below`,
    },
    {
        id: 'crm',
        icon: '🔌',
        title: 'CRM Integration',
        content: `Connect your existing CRM to automatically send leads to the AI and receive booking updates.

**Inbound Webhook (CRM → ReplyDesk)**
1. Go to **Settings → CRM Integration**
2. Click **Generate API Key** — copy the key immediately (it's only shown once)
3. Your inbound webhook URL is: \`https://your-domain.com/api/webhook/inbound/{your-api-key}\`
4. In your CRM, set up an automation to POST new leads to this URL

**Payload Format**
\`\`\`json
{
  "name": "Jane Smith",
  "phone": "+447123456789",
  "email": "jane@example.com",
  "source": "Instagram Ad",
  "notes": "Interested in headshots"
}
\`\`\`
Only \`name\` or \`phone\` is required. All other fields are optional but help the AI personalize the conversation.

**Outbound Webhook (ReplyDesk → CRM)**
1. Enter your CRM's webhook URL in the **Outbound Webhook URL** field
2. Click **Save URL**, then **🧪 Test** to verify the connection
3. ReplyDesk will POST events to your URL when leads change status (e.g., booked, human required)

**Webhook Logs**
- View recent inbound and outbound webhook activity with status codes and response times
- Use this to debug integration issues

**Works with any CRM** — Salesforce, HubSpot, GoHighLevel, custom CRMs, or anything that supports webhooks. You can also connect via Zapier or Make using the generic "Webhooks" trigger/action.`,
    },
    {
        id: 'faq',
        icon: '❓',
        title: 'FAQ',
        content: `**Do test leads affect the AI?**
No. Test leads created in the Sandbox are completely isolated. They don't appear in analytics, the training queue, or the Dashboard sidebar.

**How does cost per lead / cost per booking work?**
Set your monthly ad spend in Settings. The dashboard divides this by total leads (cost per lead) and total bookings (cost per booking). Update the number monthly for accurate tracking.

**Can I take over a conversation from the AI?**
Yes. Click a lead in the Dashboard, then toggle the takeover switch. The AI will stop responding and you can reply manually. Toggle it back when you're done.

**How do bookings work?**
The AI connects to your diary/calendar system headlessly. When a lead agrees to a date and time, the AI creates the booking automatically.

**What happens if the AI can't handle a lead?**
Leads are marked as "Human Required" and flagged in the sidebar with a warning icon. You'll see them in the "Why They Didn't Book" analytics so you can follow up manually.

**How do I improve the AI?**
Go to the Command Center → Training Queue. Review the AI's responses, approve good ones, and provide corrections for bad ones. Upload relevant documents to the Knowledge Base to give the AI more context about your business.`,
    },
];

export default function DocsPage() {
    return (
        <AppShell title="Documentation">
            <div className="rd-docs">
                {/* Table of contents */}
                <nav className="rd-docs-toc">
                    <h3 className="rd-docs-toc-title">Contents</h3>
                    {SECTIONS.map((s) => (
                        <a key={s.id} href={`#${s.id}`} className="rd-docs-toc-link">
                            <span>{s.icon}</span>
                            <span>{s.title}</span>
                        </a>
                    ))}
                </nav>

                {/* Content */}
                <div className="rd-docs-content">
                    {SECTIONS.map((section) => (
                        <section key={section.id} id={section.id} className="rd-docs-section">
                            <h2 className="rd-docs-section-title">
                                {section.icon} {section.title}
                            </h2>
                            <div className="rd-docs-section-body">
                                {section.content.split('\n\n').map((para, i) => {
                                    if (para.startsWith('```')) {
                                        const code = para.replace(/```\w*\n?/g, '').trim();
                                        return <pre key={i} className="rd-webhook-code">{code}</pre>;
                                    }
                                    if (para.startsWith('> ')) {
                                        return (
                                            <div key={i} className="rd-docs-note">
                                                {para.replace(/^>\s?\*\*/, '').replace(/\*\*$/, '')}
                                            </div>
                                        );
                                    }
                                    return (
                                        <p
                                            key={i}
                                            className="rd-docs-para"
                                            dangerouslySetInnerHTML={{
                                                __html: para
                                                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                                                    .replace(/^- /gm, '• ')
                                                    .replace(/\n/g, '<br/>'),
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
