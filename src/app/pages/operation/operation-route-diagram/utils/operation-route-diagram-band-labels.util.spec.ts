import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import {
    buildBandLabels,
    computeExtraSidePads,
    estimateTextWidth,
    placeLabel,
    ROUTE_DIAGRAM_TIME_FONT_SIZE,
} from './operation-route-diagram-band-labels.util';
import { OperationRouteDiagramBandViewModel } from './operation-route-diagram-build-band-view-models.util';
import { ROUTE_DIAGRAM_SIDE_PAD } from './operation-route-diagram-fit-columns.util';
import { ROUTE_DIAGRAM_OUTSIDE_LEFT_ID } from './operation-route-diagram-reconnect-trip-operation-lists.util';

const stations = (...ids: string[]) =>
    ids.map((stationId) => ({ stationId }) as StationDetailsDto);

const vm = (
    overrides: Partial<OperationRouteDiagramBandViewModel>,
): OperationRouteDiagramBandViewModel =>
    ({
        leftIndex: 0,
        rightIndex: 1,
        leftTime: '05:01:00',
        rightTime: '05:30:00',
        depotOut: false,
        depotIn: false,
        depotOutMarker: false,
        depotInMarker: false,
        depotOutIndex: 0,
        depotInIndex: 1,
        ...overrides,
    }) as OperationRouteDiagramBandViewModel;

describe('estimateTextWidth', () => {
    it('全角は字の大きさ、半角はその 0.6 倍とみなす', () => {
        expect(estimateTextWidth('各停', 12)).toBe(24);
        expect(estimateTextWidth('1234', 10)).toBe(24);
    });
});

describe('placeLabel', () => {
    it('縦線にかからなければ区間の中央に置く', () => {
        expect(placeLabel(40, 200, undefined, 1000)).toBe(180);
    });

    it('縦線にかかるときは、区間の中央に近い側へずらす', () => {
        // 中央 200・幅 40 → 180〜220。縦線 210 にかかるので左（210-6-40=164）か右（216）
        expect(placeLabel(40, 200, 210, 1000)).toBe(164);
    });

    it('図の外へははみ出させない', () => {
        expect(placeLabel(40, 10, undefined, 1000)).toBe(4);
        expect(placeLabel(40, 995, undefined, 1000)).toBe(956);
    });
});

describe('buildBandLabels', () => {
    it('端の外側に時刻を 4 桁で書き、○・△ のある端は間を広げる', () => {
        const labels = buildBandLabels(
            vm({ depotOutMarker: true, depotOutIndex: 0 }),
            stations('a', 'b'),
        );

        expect(labels).toEqual({
            leftLabel: '0501',
            rightLabel: '0530',
            stub: false,
            leftGap: 13,
            rightGap: 6,
        });
    });

    it('隠した駅から付け替えた端は、時刻の前に本当の駅名を書く', () => {
        const labels = buildBandLabels(
            vm({ leftStationName: '新宿' }),
            stations('a', 'b'),
        );

        expect(labels.leftLabel).toBe('新宿 0501');
    });

    it('両端とも同じ図外の列なら、外側に「駅名 時刻→時刻」とまとめる', () => {
        const labels = buildBandLabels(
            vm({
                leftIndex: 0,
                rightIndex: 0,
                depotOutTime: '05:01:00',
                depotInTime: '05:30:00',
                startHiddenStationName: '新宿',
                endHiddenStationName: '新宿',
            }),
            stations(ROUTE_DIAGRAM_OUTSIDE_LEFT_ID, 'b'),
        );

        expect(labels.stub).toBe(true);
        expect(labels.leftLabel).toBe('新宿 0501→0530');
        expect(labels.rightLabel).toBeUndefined();
    });
});

describe('computeExtraSidePads', () => {
    it('既定の余白に収まるなら足さない', () => {
        const viewModels = [vm({})];
        const labels = viewModels.map((v) =>
            buildBandLabels(v, stations('a', 'b')),
        );

        expect(computeExtraSidePads(viewModels, labels, 2)).toEqual({
            left: 0,
            right: 0,
        });
    });

    it('端の列の外側の字が既定の余白を超える分だけ足す', () => {
        const viewModels = [vm({ leftStationName: '横浜駅前停留所' })];
        const labels = viewModels.map((v) =>
            buildBandLabels(v, stations('a', 'b')),
        );
        const need =
            6 +
            estimateTextWidth(
                '横浜駅前停留所 0501',
                ROUTE_DIAGRAM_TIME_FONT_SIZE,
            ) +
            4;

        expect(computeExtraSidePads(viewModels, labels, 2)).toEqual({
            left: need - ROUTE_DIAGRAM_SIDE_PAD,
            right: 0,
        });
    });
});
