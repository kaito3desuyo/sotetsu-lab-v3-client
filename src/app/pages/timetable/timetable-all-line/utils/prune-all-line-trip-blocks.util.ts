import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

/**
 * 全線時刻表をサーバーで描くのに要る分だけに、運行（trip-block）を削る。
 *
 * サーバーで並べた順の先頭から、列に出す列車が `pageSize` 本に届くまでの運行を残す。
 * 残した運行の中身（列車と全駅の時刻）は削らない。表は 1 本ごとに全駅の時刻を出すため。
 * 路線の絞り込みで隠れる列車は数えない（`isListed`）。数えると 1 ページ目が欠ける。
 *
 * 削った結果は全量の代わりにならない。キャッシュには入れず、描くためだけに使う。
 */
export function pruneAllLineTripBlocks(
    sorted: readonly TripBlockDetailsDto[],
    pageSize: number,
    isListed: (trip: TripDetailsDto) => boolean = () => true,
): TripBlockDetailsDto[] {
    const kept: TripBlockDetailsDto[] = [];
    let listed = 0;
    for (const block of sorted) {
        if (listed >= pageSize) break;
        const count = (block.trips ?? []).filter(isListed).length;
        if (count === 0) continue;
        kept.push(block);
        listed += count;
    }
    return kept;
}
