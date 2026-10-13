import { OperationItineraryLinkDto } from './dtos/operation-itinerary-link.dto';

/** 端が「別の運用へ・から」の乗り移りか（◎）。それ以外の入出庫は車庫の △○。 */
export type DepotEndKind = 'transfer' | 'depot';

/**
 * 端が別の運用への乗り移りかを、つながりだけで返す（決まり 2）。depot の値は見ない。
 * - 終点側（in）: その区間に next（決まり 2）がある → 別の運用へ
 * - 始点側（out）: その区間に previous（決まり 2）がある → 別の運用から
 * 列車とは tripOperationListId、なければ tripId で結ぶ。
 * 決まり 1（列車の途中で運番が変わる）は扱わない。
 */
export function isTransferEnd(params: {
    side: 'in' | 'out';
    tripOperationListId?: string;
    tripId?: string;
    links: OperationItineraryLinkDto[];
}): boolean {
    const { side, tripOperationListId, tripId, links } = params;
    const link =
        (tripOperationListId
            ? links.find((l) => l.tripOperationListId === tripOperationListId)
            : undefined) ??
        (tripId ? links.find((l) => l.tripId === tripId) : undefined);
    if (!link) return false;
    const end = side === 'in' ? link.next : link.previous;
    return !!end && end.rule === 2;
}

export function transferLabel(side: 'in' | 'out'): string {
    return side === 'in' ? '別の運用へ' : '別の運用から';
}
