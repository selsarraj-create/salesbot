/**
 * Quiet Hours Utility
 * Checks whether the current time falls within a tenant's quiet hours.
 * Only affects live messages — sandbox/testing is exempt.
 */

export function isQuietHours(
    quietStart: string | null | undefined,
    quietEnd: string | null | undefined,
    timezone: string = 'Europe/London'
): boolean {
    if (!quietStart || !quietEnd) return false;

    try {
        // Get current time in tenant's timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(now);
        const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const currentMinutes = currentHour * 60 + currentMinute;

        const [startH, startM] = quietStart.split(':').map(Number);
        const [endH, endM] = quietEnd.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        // Handle overnight quiet hours (e.g. 21:00 → 08:00)
        if (startMinutes > endMinutes) {
            // Quiet if current >= start OR current < end
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        } else {
            // Normal range (e.g. 13:00 → 14:00)
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
    } catch (err) {
        console.error('[QuietHours] Error checking quiet hours:', err);
        return false; // Fail open — don't block messages if there's an error
    }
}
