import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';

/** サーバーで中身まで描くカードの数。1440px で 1 段目の 4 面。カードは縦に長く 1 段で画面が埋まる（2026-10-28 実測） */
export const SERVER_RENDERED_CARDS = 4;

/**
 * 運用表をサーバーで描くのに要る分だけに、運用ごとの列車を削る。
 *
 * 運用番号の順に並べた先頭 `keep` 本の運用は、サーバーが中身まで描くのでそのまま残す。
 * 残りの運用は、場所取りの高さ（placeholderHeight）と運用群の絞り込みに要る分だけにする。
 * 列車の数と並びは保ち、各列車は `tripOperationListId`・`tripId`・`tripDirection`・`depotIn`・`depotOut` だけにする。
 * 運用そのもの（番号・群）は全部残す。
 *
 * 削った結果は全量の代わりにならない。キャッシュには入れず、描くためだけに使う。
 */
export function pruneOperationTrips(
    sorted: readonly OperationTripsDto[],
    keep: number,
): OperationTripsDto[] {
    return sorted.map((operationTrip, index) => {
        if (index < keep) return operationTrip;
        return {
            operation: operationTrip.operation,
            trips: operationTrip.trips.map((tripOperationList) => {
                const trip = tripOperationList.trip;
                // わざと項目を欠いた形にする（上の説明のとおり、描く分だけ）。型は全量の DTO のまま渡す
                return {
                    tripOperationListId: tripOperationList.tripOperationListId,
                    trip: {
                        tripId: trip.tripId,
                        tripDirection: trip.tripDirection,
                        depotIn: trip.depotIn,
                        depotOut: trip.depotOut,
                    },
                } as OperationTripsDto['trips'][number];
            }),
        };
    });
}
