import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';

/**
 * times の時刻（分換算）。departureTime ?? arrivalTime を採用し、
 * days（**1-based**。day 1 = 営業日当日、day 2 = 24 時超えの翌日分）を加味して
 * 営業日 0 時からの絶対分に換算する。両方欠落なら undefined。
 */
function toAbsoluteMinutes(time: TimeDetailsDto): number | undefined {
    const usesDeparture = time.departureTime != null;
    const value = time.departureTime ?? time.arrivalTime;
    if (value == null) {
        return undefined;
    }
    const days =
        (usesDeparture
            ? (time.departureDays ?? time.arrivalDays)
            : (time.arrivalDays ?? time.departureDays)) ?? 1;
    const [hours = 0, minutes = 0, seconds = 0] = value
        .split(':')
        .map((part) => Number(part));
    return (days - 1) * 1440 + hours * 60 + minutes + seconds / 60;
}

function sortTimes(
    times: readonly TimeDetailsDto[] | undefined,
): TimeDetailsDto[] {
    return [...(times ?? [])].sort(
        (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
}

/**
 * block 内で「時系列で最後」の trip の最終停車駅（stopSequence 順の末尾）を返す。
 * 判定は各 trip の times 最終時刻（days 1-based を加味した絶対分）の比較による。
 * 時刻が全 trip で欠落している場合は undefined
 * （呼び出し側で trip 単体の最終駅にフォールバックする）。
 */
function determineBlockDestinationStationId(
    trips: readonly TripDetailsDto[],
): string | undefined {
    let best: { stationId: string; lastMinutes: number } | undefined;
    for (const trip of trips) {
        const times = sortTimes(trip.times);
        const last = times[times.length - 1];
        if (!last?.stationId) {
            continue;
        }
        const lastMinutes = toAbsoluteMinutes(last);
        if (lastMinutes === undefined) {
            continue;
        }
        if (!best || lastMinutes > best.lastMinutes) {
            best = { stationId: last.stationId, lastMinutes };
        }
    }
    return best?.stationId;
}

/**
 * tripBlocks から tripId → カード表示用データのマップを構築する純関数。
 * データ取得・HTTP は一切扱わない（呼び出し側の責務）。
 *
 * - 行き先は「所属 trip block の最終目的地」（同一 block 内で時系列最後の trip の
 *   最終停車駅）を block 内の全 trip のカードに使う。時刻が欠落して判定不能な場合は
 *   trip 単体の最終駅にフォールバックする。trip.times に station が含まれないため、
 *   駅名は呼び出し側が渡す `stationNameById`（全駅 stationId→駅名）から解決する。
 * - 種別名はカード表示用にベース種別名（系統サフィックス「（…）」除去）にする。
 * - 充当編成番号は `includeFormation`（今日有効ダイヤ表示時のみ true）が立っている場合のみ埋め、
 *   目撃クロスセクションが未取得・存在しない場合は undefined のまま（カード側で非表示にする）。
 * - 編成の所属会社名は、クロスセクションの formation.agencyId を呼び出し側が渡す
 *   `agencyNameById`（グローバル AgencyList 由来）で解決する（解決不能なら undefined）。
 */
export function buildTrainLocationCards(
    tripBlocks: readonly TripBlockDetailsDto[],
    operationSightingTimeCrossSections: Readonly<
        Record<string, OperationSightingTimeCrossSectionDto>
    >,
    includeFormation: boolean,
    calendarId: string,
    stationNameById: ReadonlyMap<string, string>,
    agencyNameById: ReadonlyMap<string, string> = new Map(),
): Map<string, TrainLocationCard> {
    const cards = new Map<string, TrainLocationCard>();

    for (const block of tripBlocks) {
        const trips = block.trips ?? [];
        const blockDestinationStationId =
            determineBlockDestinationStationId(trips);

        for (const trip of trips) {
            if (trip.tripId === undefined) {
                continue;
            }

            const times = sortTimes(trip.times);
            const destinationStationId =
                blockDestinationStationId ??
                times[times.length - 1]?.stationId;
            const destinationName = destinationStationId
                ? (stationNameById.get(destinationStationId) ?? '')
                : '';

            const operationNumber =
                trip.tripOperationLists?.[0]?.operation?.operationNumber;
            const formation =
                includeFormation && operationNumber
                    ? operationSightingTimeCrossSections[operationNumber]
                          ?.expectedSighting?.formation
                    : undefined;
            const formationNumber = formation?.formationNumber;
            const formationAgencyName =
                formationNumber && formation?.agencyId
                    ? agencyNameById.get(formation.agencyId)
                    : undefined;

            cards.set(trip.tripId, {
                tripId: trip.tripId,
                tripNumber: trip.tripNumber ?? '',
                tripClassName: baseTripClassName(trip.tripClass?.tripClassName),
                tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
                operationNumber,
                destinationName,
                direction:
                    trip.tripDirection === ETripDirection.INBOUND
                        ? 'inbound'
                        : 'outbound',
                formationNumber,
                formationAgencyName,
                detailLink: [
                    '/timetable',
                    'all-line',
                    {
                        calendar_id: calendarId,
                        trip_direction: String(trip.tripDirection ?? ''),
                        trip_block_id: trip.tripBlockId ?? '',
                    },
                ],
            });
        }
    }

    return cards;
}
