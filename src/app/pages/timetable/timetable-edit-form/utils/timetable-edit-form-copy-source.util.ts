import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';

export interface ITimetableEditFormCopySourceOption {
    tripBlockId: string;
    /** 例: '0512 海老名 5:12 → 横浜'。続く列車があれば ' → 1234' を足す */
    label: string;
    /** 絞り込みに使う文字（列番・駅名・種別名・時刻の数字） */
    searchText: string;
    /** 並べ替えに使う最初の列車の列番 */
    tripNumber: string;
}

export interface ITimetableEditFormCopySourceGroup {
    tripClass: TripClassDetailsDto | null;
    name: string;
    color: string | null;
    options: ITimetableEditFormCopySourceOption[];
}

function sortedTimes(times: TimeDetailsDto[] | undefined): TimeDetailsDto[] {
    return [...(times ?? [])].sort(
        (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
}

/**
 * コピー元の候補（trip-block）を種別ごとにまとめる。種別は sequence の順、
 * 組の中は列番の順。種別の分からない候補は最後の組へ。
 */
export function buildCopySourceGroups(
    blocks: readonly TripBlockDetailsDto[],
    tripClasses: readonly TripClassDetailsDto[],
    stations: readonly StationDetailsDto[],
): ITimetableEditFormCopySourceGroup[] {
    const stationNames = new Map(
        stations.map((s) => [s.stationId, s.stationName]),
    );
    // 届く種別一覧は並んでいないことがあるので sequence で並べる（相鉄→直通先→回送・不明）
    const ordered = [...tripClasses].sort(
        (a, b) =>
            (a.sequence ?? Number.MAX_SAFE_INTEGER) -
            (b.sequence ?? Number.MAX_SAFE_INTEGER),
    );
    const groups = new Map<string, ITimetableEditFormCopySourceGroup>(
        ordered.map((tc) => [
            tc.tripClassId,
            {
                tripClass: tc,
                name: tc.tripClassName ?? '',
                color: tc.tripClassColor ?? null,
                options: [],
            },
        ]),
    );
    const unknown: ITimetableEditFormCopySourceGroup = {
        tripClass: null,
        name: '種別なし',
        color: null,
        options: [],
    };

    for (const block of blocks) {
        const trips = block.trips ?? [];
        const first = trips[0];
        if (!first) continue;

        const firstTimes = sortedTimes(first.times);
        const lastTimes = sortedTimes(trips[trips.length - 1].times);
        const origin = firstTimes[0];
        const destination = lastTimes[lastTimes.length - 1];
        const originName = stationNames.get(origin?.stationId) ?? '';
        const destinationName = stationNames.get(destination?.stationId) ?? '';
        const departure = (origin?.departureTime ?? origin?.arrivalTime ?? '')
            .split(':')
            .slice(0, 2);
        const shown =
            departure.length === 2
                ? `${Number(departure[0])}:${departure[1]}`
                : '';
        const digits = departure.join('');
        const numbers = trips.map((t) => t.tripNumber ?? '');
        const group = groups.get(first.tripClassId) ?? unknown;

        group.options.push({
            tripBlockId: block.tripBlockId,
            label: [
                `${numbers[0]} ${originName} ${shown} → ${destinationName}`,
                ...numbers.slice(1),
            ].join(' → '),
            searchText: [
                ...numbers,
                originName,
                destinationName,
                group.name,
                digits,
                digits.replace(/^0/, ''),
            ].join(' '),
            tripNumber: numbers[0],
        });
    }

    return [...groups.values(), unknown]
        .filter((g) => g.options.length > 0)
        .map((g) => ({
            ...g,
            options: [...g.options].sort((a, b) =>
                a.tripNumber.localeCompare(b.tripNumber, 'ja', {
                    numeric: true,
                }),
            ),
        }));
}

/** 列番・駅名・種別名・時刻（'512' '0512' '5:12'）で絞り込む */
export function filterCopySourceGroups(
    groups: readonly ITimetableEditFormCopySourceGroup[],
    query: string,
): ITimetableEditFormCopySourceGroup[] {
    const words = query.replace(/:/g, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [...groups];

    return groups
        .map((g) => ({
            ...g,
            options: g.options.filter((o) =>
                words.every((w) => o.searchText.includes(w)),
            ),
        }))
        .filter((g) => g.options.length > 0);
}
