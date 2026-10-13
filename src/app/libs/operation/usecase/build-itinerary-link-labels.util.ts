import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';

export interface MidTripLabel {
    from: string | null;
    to: string | null;
}

export interface ItineraryLinkLabels {
    /** 運用の頭: 「↓ 11K から」 */
    from: string | null;
    /** 運用の末尾: 「↓ 12K へ」 */
    to: string | null;
    /**
     * 列車の途中の前後の運用（tripId ごと）。
     * from: その列車の始点で前の運用から来る「↓ 17K から」。
     * to: その列車の終点で次の運用へ行く「↓ 17K へ」「赤羽岩淵から 18K へ」。
     */
    midTrip: Record<string, MidTripLabel>;
}

/**
 * 運用表・行路図の前後の運用の文言（spec 5.3）。
 * 頭の列車の前・末尾の列車の次は「↓ 11K から」「↓ 12K へ」。
 * 列車の途中の切り替え（決まり 1）と、途中の列車に付いた前後の運用（出かけて戻る）はその列車に。
 */
export function buildItineraryLinkLabels(params: {
    operationId: string;
    tripIds: string[];
    links: OperationItineraryLinkDto[];
    stationNameById: (id: string) => string;
}): ItineraryLinkLabels {
    const { operationId, tripIds, links, stationNameById } = params;
    const own = links.filter((o) => o.operationId === operationId);
    const first = tripIds[0];
    const last = tripIds[tripIds.length - 1];
    const midTrip: Record<string, MidTripLabel> = {};
    let from: string | null = null;
    let to: string | null = null;
    const add = (tripId: string, side: 'from' | 'to', text: string) => {
        const entry = (midTrip[tripId] ??= { from: null, to: null });
        entry[side] = entry[side] ? `${entry[side]}　${text}` : text;
    };
    for (const link of own) {
        if (link.previous && link.previous.rule !== 1) {
            if (link.tripId === first) {
                from = `↓ ${link.previous.operationNumber} から`;
            } else {
                add(
                    link.tripId,
                    'from',
                    `↓ ${link.previous.operationNumber} から`,
                );
            }
        }
        if (link.next) {
            if (link.next.rule === 1) {
                add(
                    link.tripId,
                    'to',
                    `${stationNameById(link.next.stationId)}から ${link.next.operationNumber} へ`,
                );
            } else if (link.tripId === last) {
                to = `↓ ${link.next.operationNumber} へ`;
            } else {
                add(link.tripId, 'to', `↓ ${link.next.operationNumber} へ`);
            }
        }
    }
    return { from, to, midTrip };
}
