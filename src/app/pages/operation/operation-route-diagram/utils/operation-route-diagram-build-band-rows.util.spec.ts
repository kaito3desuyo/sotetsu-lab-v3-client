import { OperationRouteDiagramBandLabels } from './operation-route-diagram-band-labels.util';
import {
    buildBandRows,
    ROUTE_DIAGRAM_NON_REVENUE_COLOR,
    ROUTE_DIAGRAM_ROW_HEIGHT,
    ROUTE_DIAGRAM_ROW_TOP_MARGIN,
} from './operation-route-diagram-build-band-rows.util';
import { OperationRouteDiagramBandViewModel } from './operation-route-diagram-build-band-view-models.util';

const vm = (
    overrides: Partial<OperationRouteDiagramBandViewModel>,
): OperationRouteDiagramBandViewModel =>
    ({
        tripOperationListId: 'tol',
        tripNumber: '1001',
        tripClassName: '各停',
        style: 'standard',
        color: '#0000ff',
        leftIndex: 0,
        rightIndex: 2,
        depotOut: false,
        depotIn: false,
        depotOutMarker: false,
        depotInMarker: false,
        depotOutIndex: 0,
        depotInIndex: 2,
        ...overrides,
    }) as OperationRouteDiagramBandViewModel;

const labels: OperationRouteDiagramBandLabels = {
    leftLabel: '0501',
    rightLabel: '0530',
    stub: false,
    leftGap: 6,
    rightGap: 6,
};

const metrics = { leftPad: 50, columnWidth: 100, width: 300 };

describe('buildBandRows', () => {
    it('行ごとに線の y と、駅の列から求めた両端の x を持つ', () => {
        const rows = buildBandRows(
            [vm({}), vm({ tripOperationListId: 'tol-2' })],
            [labels, labels],
            metrics,
        );

        expect(rows.map((row) => row.centerY)).toEqual([
            ROUTE_DIAGRAM_ROW_TOP_MARGIN,
            ROUTE_DIAGRAM_ROW_TOP_MARGIN + ROUTE_DIAGRAM_ROW_HEIGHT,
        ]);
        expect(rows[0]).toMatchObject({
            leftX: 50,
            rightX: 250,
            leftTimeX: 44,
            rightTimeX: 256,
            connectorGradientId: 'route-diagram-connector-gradient-tol',
        });
    });

    it('入庫しない列車は、着いた端から次の列車の線まで縦線を下ろす', () => {
        const rows = buildBandRows(
            [vm({}), vm({ tripOperationListId: 'tol-2', color: '#ff0000' })],
            [labels, labels],
            metrics,
        );

        expect(rows[0]).toMatchObject({
            connectorX: 250,
            connectorY1: rows[0].centerY,
            connectorY2: rows[1].centerY,
            connectorEndColor: '#ff0000',
        });
        expect(rows[1].connectorX).toBeUndefined();
    });

    it('入庫する列車からは縦線を下ろさず、回送は灰で塗る', () => {
        const rows = buildBandRows(
            [
                vm({ depotIn: true, style: 'nonRevenue' }),
                vm({ tripOperationListId: 'tol-2' }),
            ],
            [labels, labels],
            metrics,
        );

        expect(rows[0].connectorX).toBeUndefined();
        expect(rows[0].color).toBe(ROUTE_DIAGRAM_NON_REVENUE_COLOR);
        expect(rows[0].chipFill).toBe(ROUTE_DIAGRAM_NON_REVENUE_COLOR);
    });
});
