'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

interface BookedLead {
    id: string;
    lead_code: string;
    name?: string;
    created_at: string;
    shoot_date?: string;
}

export default function BookingsFeed() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookedLead[]>([]);

    useEffect(() => {
        if (!user) return;

        async function fetchBookings() {
            const { data, error } = await supabase
                .from('leads')
                .select('id, lead_code, name, created_at, shoot_date')
                .eq('status', 'Booked')
                .neq('is_test', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                setBookings(data as BookedLead[]);
            }
        }

        fetchBookings();
    }, [user]);

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="rd-analytics-card">
            <h3 className="rd-analytics-card-title">📅 Recent Bookings</h3>
            {bookings.length === 0 ? (
                <p className="rd-analytics-empty">No bookings yet</p>
            ) : (
                <div className="rd-bookings-list">
                    {bookings.map(b => (
                        <div key={b.id} className="rd-booking-item">
                            <div className="rd-booking-badge">✅</div>
                            <div className="rd-booking-info">
                                <span className="rd-booking-name">
                                    {b.name || b.lead_code}
                                </span>
                                <span className="rd-booking-date">
                                    Booked {formatDate(b.created_at)}
                                    {b.shoot_date && ` · Shoot: ${formatDate(b.shoot_date)}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
