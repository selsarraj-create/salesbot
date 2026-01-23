// Mock Concierge Service (TfL & Weather)

export interface TflStatus {
    line: string;
    status: 'Good Service' | 'Minor Delays' | 'Severe Delays' | 'Suspended';
    details?: string;
}

export interface WeatherStatus {
    location: string;
    condition: 'Sunny' | 'Cloudy' | 'Rain' | 'Heavy Rain' | 'Storm';
    temp: number;
}

export async function getTflStatus(): Promise<TflStatus[]> {
    // In production, fetch from https://api.tfl.gov.uk/Line/northern/Status
    // Mocking random delays for demo purposes
    const isDelay = Math.random() > 0.7; // 30% chance of delay

    return [
        {
            line: 'Northern Line',
            status: isDelay ? 'Minor Delays' : 'Good Service',
            details: isDelay ? 'Minor delays due to signal failure at Camden Town.' : undefined
        },
        {
            line: 'Thameslink',
            status: 'Good Service'
        }
    ];
}

export async function getWeather(location = 'NW5'): Promise<WeatherStatus> {
    // In production, fetch from OpenWeatherMap
    const conditions: WeatherStatus['condition'][] = ['Sunny', 'Cloudy', 'Rain', 'Heavy Rain'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
        location,
        condition: randomCondition,
        temp: 14 // degrees C
    };
}
