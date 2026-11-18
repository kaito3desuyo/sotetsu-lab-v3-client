import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    formatClock,
    toZeroBasedDays,
} from '../../timetable-formation/utils/formation-display.util';

export type OperationDayRow =
    | {
          kind: 'trip';
          trip: TripOperationListDetailsDto;
          /** その列車を走った編成。分からなければ null */
          formationNumber: string | null;
          /** 推し量り（持ち越しの目撃・time-cross-section）なら true。「?」を付ける */
          inferred: boolean;
          /** この列車で見た目撃の時刻（ISO・時刻順） */
          sightingTimes: string[];
      }
    | { kind: 'depot'; label: 'out' | 'in'; stationId: string; time: string }
    | { kind: 'swap'; sightingTime: string; toFormationNumber: string }
    /** 車両が from の運用から to の運用へ移る所。どちらかがこの運用 */
    | { kind: 'transfer'; from: string; to: string; stationId: string };

export interface OperationDayInput {
    /** 見ている運用（その日のダイヤの運用 ID） */
    operationId: string;
    /** 営業日 'yyyy-MM-dd'。ダイヤの形では null（編成を決めない） */
    baseDate: string | null;
    trips: OperationTripsDto;
    /** その営業日の全目撃（includeCarriedOver=true で取ったもの） */
    sightings: OperationSightingDetailsDto[];
    formationNumberById: Record<string, string>;
    /** 今日で、この運用に今日の目撃が無いときの time-cross-section の編成番号。それ以外は null */
    inferredFormationNumber: string | null;
    /** そのダイヤの、運番が変わるつながり（区間ごと）。無ければ運番変更の行を出さない */
    links?: OperationItineraryLinkDto[];
}

function startSeconds(t: TripOperationListDetailsDto): number {
    const s = t.startTime;
    const v = toServiceSeconds(
        toZeroBasedDays(s?.departureDays),
        s?.departureTime,
    );
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(s?.arrivalDays), s?.arrivalTime)
        : v;
}

function endSeconds(t: TripOperationListDetailsDto): number {
    const e = t.endTime;
    const v = toServiceSeconds(toZeroBasedDays(e?.arrivalDays), e?.arrivalTime);
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(e?.departureDays), e?.departureTime)
        : v;
}

/** 持ち越し（引き継ぎ）の目撃か。api は引き継ぎに sightedAsOperation、写しに carriedFromSightingId を付ける */
const isCarried = (s: OperationSightingDetailsDto): boolean =>
    !!s.sightedAsOperation || !!s.carriedFromSightingId;

/**
 * 運用の 1 日の列車の並びと、列車ごとに走った編成を組み立てる
 * （設計書「列車ごとの編成の決め方」）。
 * - 目撃した時刻を含む列車から、その目撃の編成が走ったとする。列車と列車の間なら次の列車から。
 * - 最初の目撃より前は、持ち越しの目撃 → time-cross-section の順で推し量る（inferred）。
 * - 続く 2 つの目撃で編成が違えば、後の編成が走る最初の列車の前に swap の行を入れる。
 * - 並べるのはこの運用の列車だけ。車両が別の運用へ移る列車のあとと、別の運用から戻ってくる列車の前に
 *   transfer の行を入れる（出庫・入庫の行より外側）。
 */
export function buildOperationDay(input: OperationDayInput): OperationDayRow[] {
    const trips = [...input.trips.trips].sort(
        (a, b) => startSeconds(a) - startSeconds(b),
    );
    if (trips.length === 0) return [];

    const numberOf = (formationId: string): string | null =>
        input.formationNumberById[formationId] ?? null;
    const byTime = (
        a: OperationSightingDetailsDto,
        b: OperationSightingDetailsDto,
    ): number => Date.parse(a.sightingTime) - Date.parse(b.sightingTime);

    const valid =
        input.baseDate === null
            ? []
            : input.sightings.filter(
                  (s) => s.operationId === input.operationId && !s.invalidation,
              );
    const carried = valid.filter(isCarried).sort(byTime);
    const direct = valid.filter((s) => !isCarried(s)).sort(byTime);

    // 同日引き継ぎの写しのうち、写した枠の始まりが分かるもの。その枠の最初の列車から当てる
    const placed = carried.filter((s) => s.carriedRunStartSeconds != null);
    // 枠の分からない持ち越し（前日からの引き継ぎ・枠の始まりを返さない古い api の写し）は、最初の列車からの推し量りにする。
    // 編成が食い違うものが 2 件以上あれば、どの枠のものか分からないので使わない
    const unplaced = carried.filter((s) => s.carriedRunStartSeconds == null);
    const unplacedAgree = new Set(unplaced.map((s) => s.formationId)).size <= 1;
    const lastCarried = unplacedAgree ? unplaced.at(-1) : undefined;
    let current: {
        formationId: string | null;
        number: string | null;
        inferred: boolean;
    } = lastCarried
        ? {
              formationId: lastCarried.formationId,
              number: numberOf(lastCarried.formationId),
              inferred: true,
          }
        : input.baseDate !== null && input.inferredFormationNumber
          ? {
                formationId: null,
                number: input.inferredFormationNumber,
                inferred: true,
            }
          : { formationId: null, number: null, inferred: false };

    // 目撃ごとに、その目撃の編成が走り始める列車の添字（含む列車、無ければ次の列車、最後より後なら最後）
    const baseMs = Date.parse(`${input.baseDate}T00:00:00+09:00`);
    const startIndexOf = (s: OperationSightingDetailsDto): number => {
        const sec = (Date.parse(s.sightingTime) - baseMs) / 1000;
        const i = trips.findIndex((t) => sec < endSeconds(t));
        return i >= 0 ? i : trips.length - 1;
    };
    const directAt = new Map<number, OperationSightingDetailsDto[]>();
    for (const s of direct) {
        const i = startIndexOf(s);
        directAt.set(i, [...(directAt.get(i) ?? []), s]);
    }

    // 写しごとに、写した枠の最初の列車の添字（枠の始まり以降に出る最初の列車。始まりの秒は api と同じ鉄道日の 0 時から）
    const copyAt = new Map<number, OperationSightingDetailsDto>();
    for (const s of placed) {
        const i = trips.findIndex(
            (t) => startSeconds(t) >= (s.carriedRunStartSeconds ?? 0),
        );
        if (i >= 0) copyAt.set(i, s);
    }

    // この運用の区間ごとの、運番が変わるつながり
    const ownNumber = input.trips.operation.operationNumber;
    const linkOf = new Map(
        (input.links ?? [])
            .filter((l) => l.operationId === input.operationId)
            .map((l) => [l.tripOperationListId, l]),
    );

    let lastDirectFormationId: string | null = null;
    const rows: OperationDayRow[] = [];
    trips.forEach((trip, i) => {
        // 写しは推し量りなので swap に数えない。同じ列車に直接の目撃があれば、下でそちらに替わる
        const copy = copyAt.get(i);
        if (copy) {
            current = {
                formationId: copy.formationId,
                number: numberOf(copy.formationId),
                inferred: true,
            };
        }
        const here = directAt.get(i) ?? [];
        for (const s of here) {
            const number = numberOf(s.formationId);
            if (
                lastDirectFormationId !== null &&
                s.formationId !== lastDirectFormationId &&
                number
            ) {
                rows.push({
                    kind: 'swap',
                    sightingTime: s.sightingTime,
                    toFormationNumber: number,
                });
            }
            lastDirectFormationId = s.formationId;
            current = { formationId: s.formationId, number, inferred: false };
        }
        const link = linkOf.get(trip.tripOperationListId);
        if (link?.previous) {
            rows.push({
                kind: 'transfer',
                from: link.previous.operationNumber,
                to: ownNumber,
                stationId: link.previous.stationId,
            });
        }
        if (trip.trip?.depotOut) {
            rows.push({
                kind: 'depot',
                label: 'out',
                stationId: trip.startStationId ?? '',
                time: formatClock(
                    trip.startTime?.departureDays,
                    trip.startTime?.departureTime ?? '00:00:00',
                ),
            });
        }
        rows.push({
            kind: 'trip',
            trip,
            formationNumber: current.number,
            inferred: current.inferred,
            sightingTimes: here.map((s) => s.sightingTime),
        });
        if (trip.trip?.depotIn) {
            rows.push({
                kind: 'depot',
                label: 'in',
                stationId: trip.endStationId ?? '',
                time: formatClock(
                    trip.endTime?.arrivalDays,
                    trip.endTime?.arrivalTime ?? '00:00:00',
                ),
            });
        }
        if (link?.next) {
            rows.push({
                kind: 'transfer',
                from: ownNumber,
                to: link.next.operationNumber,
                stationId: link.next.stationId,
            });
        }
    });
    return rows;
}
