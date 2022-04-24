import dayjs from 'dayjs';

export function calculateDayCountFromToday(dateTime: string): number {
    const target = dayjs(dateTime).subtract(
        dayjs(dateTime).hour() < 4 ? 1 : 0,
        'days'
    );
    const now = dayjs().subtract(dayjs().hour() < 4 ? 1 : 0, 'days');

    return now
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .diff(target.hour(0).minute(0).second(0).millisecond(0), 'days');
}
