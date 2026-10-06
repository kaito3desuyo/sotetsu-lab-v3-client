import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

/** まとめた駅の ID → 代表の駅 ID */
export type RouteDiagramStationAliases = Record<string, string>;

/**
 * 運用行路図の縦軸（駅リスト）に表示する駅を、相互直通を含む全路線の生駅マスタから
 * 主要駅（乗換駅・分岐駅・境界駅等）のみに絞り込む。
 *
 * 生の `services/:id/stations` は相互直通先（西武線・東武線・東京メトロ各線等）の
 * 全停車駅を含み数百件規模になるため、行路図として意味のある代表駅のみを
 * 名前+所属路線の組み合わせで一致させて抽出する（移行前の
 * `OperationRouteDiagramStateQuery#filterTargetStations` を移設したもの。
 * ロジック・対象駅リストは変更していない）。
 */
export function curateRouteDiagramStations(
    stations: StationDetailsDto[],
): StationDetailsDto[] {
    return curateRouteDiagramStationsWithAliases(stations).stations;
}

/**
 * `curateRouteDiagramStations` と同じ駅を選び、同じ対象に当てはまる駅が複数あれば 1 列にまとめる。
 *
 * 路線ごとに別の駅として登録された駅がある（千川は副都心線と有楽町線で別。2026-10-07）。
 * 以前は先に見つかった片方だけを列にしたため、もう片方で発着する列車は列が見つからず、
 * 図の先頭の列（湘南台）に描かれていた（平日 53K の A853K）。
 * 代表は先に見つかった駅。所属路線は全部を合わせ、ほかの駅 ID は代表の別名として返す。
 */
export function curateRouteDiagramStationsWithAliases(
    stations: StationDetailsDto[],
): { stations: StationDetailsDto[]; aliases: RouteDiagramStationAliases } {
    const aliases: RouteDiagramStationAliases = {};

    const curated = targetStations
        .map(({ routeName, stationName }) => {
            const targetSet = new Set(routeName);

            const matches = stations.filter((s) => {
                const dataSet = new Set(
                    (s.routeStationLists ?? []).map(
                        (rsl) => rsl.route?.routeName,
                    ),
                );

                const differenceSet = new Set(
                    [...dataSet].filter((x) => !targetSet.has(x)),
                );

                return (
                    differenceSet.size === 0 && s.stationName === stationName
                );
            });

            const [representative, ...others] = matches;
            if (!representative || !others.length) return representative;

            for (const other of others) {
                aliases[other.stationId] = representative.stationId;
            }

            return {
                ...representative,
                routeStationLists: matches.flatMap(
                    (s) => s.routeStationLists ?? [],
                ),
            };
        })
        .filter((o) => !!o);

    return { stations: curated, aliases };
}

/**
 * 行路の始発・終着の駅 ID を、まとめた駅の代表の駅 ID に読み替える（元の行路は変えない）。
 */
export function applyRouteDiagramStationAliases<
    T extends TripOperationListDetailsDto,
>(tripOperationLists: T[], aliases: RouteDiagramStationAliases): T[] {
    if (!Object.keys(aliases).length) return tripOperationLists;

    const resolve = (stationId: string | undefined) =>
        stationId ? (aliases[stationId] ?? stationId) : stationId;

    return tripOperationLists.map((tripOperationList) => ({
        ...tripOperationList,
        startTime: tripOperationList.startTime
            ? {
                  ...tripOperationList.startTime,
                  stationId: resolve(tripOperationList.startTime.stationId),
              }
            : tripOperationList.startTime,
        endTime: tripOperationList.endTime
            ? {
                  ...tripOperationList.endTime,
                  stationId: resolve(tripOperationList.endTime.stationId),
              }
            : tripOperationList.endTime,
    }));
}

const targetStations = [
    { routeName: ['厚木線'], stationName: '厚木' },
    { routeName: ['本線'], stationName: '海老名' },
    { routeName: ['本線', '厚木線'], stationName: 'かしわ台' },
    { routeName: ['本線'], stationName: '相模大塚' },
    { routeName: ['本線'], stationName: '大和' },
    { routeName: ['本線'], stationName: '瀬谷' },
    { routeName: ['いずみ野線'], stationName: '湘南台' },
    { routeName: ['いずみ野線'], stationName: 'いずみ野' },
    { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
    { routeName: ['本線', '新横浜線'], stationName: '西谷' },
    { routeName: ['本線', '相鉄新横浜線'], stationName: '西谷' },
    { routeName: ['本線'], stationName: '星川' },
    { routeName: ['本線'], stationName: '西横浜' },
    { routeName: ['本線'], stationName: '横浜' },
    { routeName: ['みなとみらい線'], stationName: '元町・中華街' },
    { routeName: ['みなとみらい線', '東横線'], stationName: '横浜' },
    { routeName: ['東横線'], stationName: '菊名' },
    {
        routeName: ['新横浜線', '相鉄・JR直通線'],
        stationName: '羽沢横浜国大',
    },
    {
        routeName: ['相鉄新横浜線', '相鉄・JR直通線'],
        stationName: '羽沢横浜国大',
    },
    {
        routeName: ['新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['新横浜線', '東急新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['相鉄新横浜線', '東急新横浜線'],
        stationName: '新横浜',
    },
    {
        routeName: ['東急新横浜線', '東横線', '目黒線'],
        stationName: '日吉',
    },
    {
        routeName: ['東横線', '目黒線'],
        stationName: '元住吉',
    },
    {
        routeName: ['東横線', '目黒線'],
        stationName: '武蔵小杉',
    },
    {
        routeName: ['東横線', '副都心線'],
        stationName: '渋谷',
    },
    {
        routeName: ['副都心線'],
        stationName: '新宿三丁目',
    },
    {
        routeName: ['副都心線'],
        stationName: '池袋',
    },
    {
        routeName: ['副都心線', '有楽町線'],
        stationName: '千川',
    },
    {
        routeName: ['副都心線', '有楽町線', '西武有楽町線'],
        stationName: '小竹向原',
    },
    {
        routeName: ['池袋線'],
        stationName: '池袋',
    },
    {
        routeName: ['池袋線', '西武有楽町線'],
        stationName: '練馬',
    },
    {
        routeName: ['池袋線'],
        stationName: '保谷',
    },
    {
        routeName: ['池袋線'],
        stationName: '飯能',
    },
    {
        routeName: ['池袋線'],
        stationName: '武蔵丘（信）',
    },
    {
        routeName: ['池袋線', '秩父線'],
        stationName: '吾野',
    },
    {
        routeName: ['秩父線'],
        stationName: '西武秩父',
    },
    {
        routeName: ['東上本線'],
        stationName: '池袋',
    },
    {
        routeName: ['副都心線', '有楽町線', '東上本線'],
        stationName: '和光市',
    },
    {
        routeName: ['東上本線'],
        stationName: '志木',
    },
    {
        routeName: ['東上本線'],
        stationName: '川越市',
    },
    {
        routeName: ['東上本線'],
        stationName: '森林公園',
    },
    {
        routeName: ['東上本線'],
        stationName: '小川町',
    },
    {
        routeName: ['目黒線'],
        stationName: '奥沢',
    },
    {
        routeName: ['目黒線'],
        stationName: '大岡山',
    },
    {
        routeName: ['目黒線'],
        stationName: '武蔵小山',
    },
    {
        routeName: ['目黒線', '南北線', '三田線'],
        stationName: '目黒',
    },
    {
        routeName: ['南北線', '三田線'],
        stationName: '白金高輪',
    },
    {
        routeName: ['南北線'],
        stationName: '麻布十番',
    },
    {
        routeName: ['南北線'],
        stationName: '市ケ谷',
    },
    {
        routeName: ['南北線'],
        stationName: '駒込',
    },
    {
        routeName: ['南北線', '埼玉高速鉄道線'],
        stationName: '赤羽岩淵',
    },
    {
        routeName: ['埼玉高速鉄道線'],
        stationName: '鳩ヶ谷',
    },
    {
        routeName: ['埼玉高速鉄道線'],
        stationName: '浦和美園',
    },
    {
        routeName: ['三田線'],
        stationName: '高島平',
    },
    {
        routeName: ['三田線'],
        stationName: '西高島平',
    },
    {
        routeName: ['りんかい線'],
        stationName: '新木場',
    },
    {
        routeName: ['りんかい線'],
        stationName: '東京テレポート',
    },
    {
        routeName: ['相鉄・JR直通線', '埼京線'],
        stationName: '大崎',
    },
    {
        routeName: ['相鉄・JR直通線', '埼京線', 'りんかい線'],
        stationName: '大崎',
    },
    {
        routeName: ['埼京線'],
        stationName: '新宿',
    },
    {
        routeName: ['埼京線'],
        stationName: '池袋',
    },
    {
        routeName: ['埼京線'],
        stationName: '板橋',
    },
    {
        routeName: ['埼京線'],
        stationName: '赤羽',
    },
    {
        routeName: ['埼京線'],
        stationName: '武蔵浦和',
    },
    {
        routeName: ['埼京線', '川越線'],
        stationName: '大宮',
    },
    {
        routeName: ['川越線'],
        stationName: '指扇',
    },
    {
        routeName: ['川越線'],
        stationName: '南古谷',
    },
    {
        routeName: ['川越線'],
        stationName: '川越',
    },
];
