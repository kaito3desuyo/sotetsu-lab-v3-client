import dayjs from 'dayjs';

export function calculateDayDifference(timestamp: string): number {
    const currentTime = dayjs();
    const targetTime = dayjs(timestamp);

    return currentTime
        .subtract(currentTime.hour() < 4 ? 1 : 0, 'days')
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .diff(
            targetTime
                .subtract(targetTime.hour() < 4 ? 1 : 0, 'days')
                .hour(0)
                .minute(0)
                .second(0)
                .millisecond(0),
            'days'
        );
}
