/** 駅の欄の 1 行（選んだ駅に次に来る列車 1 本） */
export interface StationArrival {
    tripId: string;
    direction: 'inbound' | 'outbound';
    /** 選んだ駅の時刻。停車は着（無ければ発）、通過は前後の停車駅から按分した推定 */
    time: Date;
    /** 発時刻。着時刻と発時刻が両方あって違うときだけ（種別が変わる駅では次の列番の発時刻） */
    departureTime?: Date;
    /** time までの分（切り上げ前の実数）。停車中は 0 */
    minutesUntil: number;
    /** 選んだ駅を通過する（時刻は推定。表示に「頃」を付ける） */
    isPassing: boolean;
    /** 選んだ駅が終点（当駅止まり） */
    isTerminal: boolean;
    /** 選んだ駅がこの列車の始発（引き継ぎで発つ列車は着く列車の行にまとめるので含まない） */
    isOrigin: boolean;
    /**
     * 選んだ駅で同じ編成が次の列番に引き継いで走り続ける（種別変更・列番の付け替え）ときの、
     * 変更後の種別・列番。「各停 7416 → 急行 054052」のように並べて出す。無ければ undefined
     */
    continuation?: {
        tripNumber: string;
        tripClassName: string;
        tripClassColor: string;
    };
    /** いま選んだ駅に停車中（着 <= at < 発） */
    isStopped: boolean;
    tripNumber: string;
    /** ベース種別名（系統サフィックス除去済み） */
    tripClassName: string;
    tripClassColor: string;
    destinationName: string;
    operationNumber?: string;
    /** 運用 ID（運用番号から運用行路図へのリンクに使う） */
    operationId?: string;
    /** 充当編成番号（カード由来。今日のダイヤ以外・未取得なら undefined） */
    formationNumber?: string;
    /** 充当編成の所属会社名（カード由来。解決できなければ undefined） */
    formationAgencyName?: string;
    /** いまどこか（「いま 瀬谷→三ツ境」「いま 鶴ヶ峰に停車中」「海老名 10:02 発」） */
    whereText: string;
    /** 全線時刻表へのリンク（カード由来。列車番号のリンクに使う。カードが無ければ undefined） */
    detailLink?: [string, string, Record<string, string>];
}

export interface StationArrivals {
    inbound: StationArrival[];
    outbound: StationArrival[];
}
