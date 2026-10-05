import { Pipe, PipeTransform } from '@angular/core';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

/**
 * 同じ運行（tripBlock）のうち、この列車より**後に走る**列車（この先の種別変更・直通）を返す。
 *
 * 前の区間（ここまでどこから来たか）は出さない（ユーザー判断 2026-09-23）。駅の時刻表は
 * 「この駅から乗ってどうなるか」を見るもので、運行全体は分のリンク（全線時刻表）でたどれる。
 *
 * 前後は各列車の始発駅の発車（無ければ到着）を「繰り越し日数 × 24h + 時刻」で比べる。
 * departureDays / arrivalDays を足すので、0 時をまたぐ運行でも取り違えない。
 * 時刻が取れない列車は前後を判定できないので、情報を落とさないよう残す。
 */
@Pipe({
    standalone: true,
    name: 'timetableStationFindOtherTripsInSameTripBlock',
})
export class TimetableStationFindOtherTripsInSameTripBlockPipe
    implements PipeTransform
{
    transform(trip: TripDetailsDto): TripDetailsDto[] {
        const start = startSeconds(trip);
        return (trip.tripBlock?.trips ?? [])
            .filter((o) => o.tripId !== trip.tripId)
            .filter((o) => {
                const otherStart = startSeconds(o);
                return (
                    start === undefined ||
                    otherStart === undefined ||
                    otherStart > start
                );
            });
    }
}

/** 始発駅（stopSequence 最小）の発車（無ければ到着）を、起点日 0 時からの秒で返す。 */
function startSeconds(trip: TripDetailsDto): number | undefined {
    const first = (trip.times ?? []).reduce<TimeDetailsDto | undefined>(
        (min, time) =>
            min === undefined || time.stopSequence < min.stopSequence
                ? time
                : min,
        undefined,
    );
    if (!first) return undefined;

    const [time, days] = first.departureTime
        ? [first.departureTime, first.departureDays]
        : [first.arrivalTime, first.arrivalDays];
    if (!time) return undefined;

    const [h, m, s] = time.split(':').map(Number);
    return (days ?? 0) * 86400 + h * 3600 + m * 60 + (s || 0);
}
