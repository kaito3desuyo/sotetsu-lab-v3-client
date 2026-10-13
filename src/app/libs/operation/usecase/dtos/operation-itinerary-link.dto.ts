export class ItineraryLinkEndDto {
    tripOperationListId: string;
    tripId: string;
    operationId: string;
    operationNumber: string;
    /** 切り替わる駅（前なら来た区間の終わる駅、次なら移る区間の始まる駅） */
    stationId: string;
    rule: 1 | 2 | 3;
}

/** 運番が変わるつながりだけを、区間ごとに返す（同じ運番どうしのつながりは返さない） */
export class OperationItineraryLinkDto {
    tripOperationListId: string;
    tripId: string;
    operationId: string;
    previous: ItineraryLinkEndDto | null;
    next: ItineraryLinkEndDto | null;
}
