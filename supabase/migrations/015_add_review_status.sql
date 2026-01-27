-- Add review_status column to messages for workflow tracking
-- Statuses: 'pending', 'approved', 'gold', 'corrected', 'skipped'
alter table public.messages 
add column if not exists review_status text default 'pending';

-- Index for fast queue filtering
create index if not exists messages_review_status_sender_idx 
on public.messages (review_status, sender_type);

-- Backfill: If already in training_feedback, mark as 'approved' (or 'gold'/'corrected' if we join, but simplified for now)
-- Actually, we can use a join update if needed, but let's just default new ones.
-- For existing ones with feedback:
update public.messages m
set review_status = 'approved'
from public.training_feedback tf
where m.id = tf.message_id
and m.review_status = 'pending';
