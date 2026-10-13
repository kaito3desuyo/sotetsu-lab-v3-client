import { buildLinkLabelPlacements } from './operation-route-diagram-link-label-placements.util';
import { OperationRouteDiagramBandRow } from './operation-route-diagram-build-band-rows.util';

function row(over: Partial<OperationRouteDiagramBandRow>) {
    return {
        centerY: 32,
        leftX: 100,
        rightX: 300,
        chipX: 180,
        chipWidth: 40,
        tripNumberX: 224,
        tripNumber: '1',
        depotOutX: 100,
        depotInX: 300,
        depotOutMarker: true,
        depotInMarker: true,
        ...over,
    } as OperationRouteDiagramBandRow;
}

describe('buildLinkLabelPlacements', () => {
    const rows = [
        row({ centerY: 32 }),
        row({
            centerY: 76,
            leftX: 300,
            rightX: 100,
            depotOutX: 300,
            depotInX: 100,
        }),
    ];
    const tripIds = ['t1', 't2'];

    it('「から」は最初の列車の始点の上に出す', () => {
        const [p] = buildLinkLabelPlacements({
            rows,
            tripIds,
            labels: { from: '↓ 11K から', to: null, midTrip: {} },
            width: 400,
        });
        expect(p.key).toBe('from');
        expect(p.y).toBeLessThan(32);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.anchor).toBe('start');
    });

    it('「へ」は最後の列車の終点の下に出す', () => {
        const [p] = buildLinkLabelPlacements({
            rows,
            tripIds,
            labels: { from: null, to: '↓ 12K へ', midTrip: {} },
            width: 400,
        });
        expect(p.key).toBe('to');
        expect(p.y).toBeGreaterThan(76);
    });

    it('途中の「へ」はその列車の終点の下に出す', () => {
        const [p] = buildLinkLabelPlacements({
            rows,
            tripIds,
            labels: {
                from: null,
                to: null,
                midTrip: { t1: { from: null, to: '赤羽岩淵から 18K へ' } },
            },
            width: 600,
        });
        expect(p.key).toBe('mid-to-t1');
        expect(p.anchor).toBe('start');
        expect(p.x).toBeCloseTo(300 - 6);
        expect(p.y).toBeGreaterThan(32);
    });

    it('18K 型: 途中の「から」は戻る列車の始点の上、「へ」は出る列車の終点の下', () => {
        const ps = buildLinkLabelPlacements({
            rows: [
                row({
                    centerY: 32,
                    depotOutMarker: true,
                    depotInMarker: false,
                }),
                row({
                    centerY: 76,
                    leftX: 300,
                    rightX: 100,
                    depotOutX: 300,
                    depotInX: 100,
                    depotOutMarker: false,
                    depotInMarker: false,
                }),
                row({
                    centerY: 120,
                    leftX: 100,
                    rightX: 300,
                    depotOutMarker: false,
                    depotInMarker: true,
                }),
            ],
            tripIds: ['t1', 't2', 't3'],
            labels: {
                from: null,
                to: null,
                midTrip: {
                    t2: { from: null, to: '↓ 17K へ' },
                    t3: { from: '↓ 17K から', to: null },
                },
            },
            width: 400,
        });
        const to = ps.find((p) => p.key === 'mid-to-t2');
        const from = ps.find((p) => p.key === 'mid-from-t3');
        expect(to?.y).toBeGreaterThan(76);
        expect(to?.y).toBeLessThan(120);
        expect(from?.y).toBeLessThan(120);
        expect(from?.y).toBeGreaterThan(76);
        expect(ps.length).toBe(2);
    });

    it('1 本の列車に from と to が両方付く', () => {
        const ps = buildLinkLabelPlacements({
            rows,
            tripIds,
            labels: {
                from: null,
                to: null,
                midTrip: { t2: { from: '↓ 91M から', to: '↓ 90M へ' } },
            },
            width: 400,
        });
        const from = ps.find((p) => p.key === 'mid-from-t2');
        const to = ps.find((p) => p.key === 'mid-to-t2');
        expect(from?.y).toBeLessThan(76);
        expect(to?.y).toBeGreaterThan(76);
    });

    it('右に収まらないときは端を右にそろえる', () => {
        const [p] = buildLinkLabelPlacements({
            rows: [row({ depotOutX: 380, leftX: 380 })],
            tripIds: ['t1'],
            labels: { from: '↓ 11K から', to: null, midTrip: {} },
            width: 400,
        });
        expect(p.anchor).toBe('end');
    });

    it('種別チップと重なるときは反対側に出す', () => {
        const [p] = buildLinkLabelPlacements({
            rows: [
                row({
                    leftX: 200,
                    depotOutX: 200,
                    chipX: 210,
                    chipWidth: 60,
                    tripNumberX: 274,
                }),
            ],
            tripIds: ['t1'],
            labels: { from: '↓ 11K から', to: null, midTrip: {} },
            width: 400,
        });
        expect(p.anchor).toBe('end');
    });

    it('下に出す「へ」が次の行のチップ・列番と重なるときは反対側の横に回す', () => {
        const [p] = buildLinkLabelPlacements({
            rows: [
                row({
                    centerY: 32,
                    rightX: 200,
                    depotInX: 200,
                    chipX: 20,
                    tripNumberX: 64,
                }),
                row({
                    centerY: 76,
                    leftX: 300,
                    rightX: 100,
                    chipX: 215,
                    chipWidth: 60,
                    tripNumberX: 279,
                    tripNumber: '3824',
                }),
            ],
            tripIds: ['t1', 't2'],
            labels: {
                from: null,
                to: null,
                midTrip: { t1: { from: null, to: '↓ 15K へ' } },
            },
            width: 600,
        });
        expect(p.key).toBe('mid-to-t1');
        expect(p.anchor).toBe('end');
        expect(p.y).toBeGreaterThan(32);
    });

    it('左右どちらでも次の行と重なるときは点の上に回す', () => {
        const [p] = buildLinkLabelPlacements({
            rows: [
                row({
                    centerY: 32,
                    rightX: 200,
                    depotInX: 200,
                    chipX: 20,
                    tripNumberX: 64,
                }),
                row({
                    centerY: 76,
                    chipX: 120,
                    chipWidth: 200,
                    tripNumberX: 324,
                    tripNumber: '3824',
                }),
            ],
            tripIds: ['t1', 't2'],
            labels: {
                from: null,
                to: null,
                midTrip: { t1: { from: null, to: '↓ 15K へ' } },
            },
            width: 600,
        });
        expect(p.y).toBeLessThan(32);
    });

    it('上も塞がっているときは次の行のチップの右へずらして下に出す', () => {
        const [p] = buildLinkLabelPlacements({
            rows: [
                row({
                    centerY: 32,
                    rightX: 200,
                    depotInX: 200,
                    chipX: 150,
                    chipWidth: 60,
                    tripNumberX: 214,
                }),
                row({
                    centerY: 76,
                    chipX: 120,
                    chipWidth: 200,
                    tripNumberX: 324,
                    tripNumber: '3824',
                }),
            ],
            tripIds: ['t1', 't2'],
            labels: {
                from: null,
                to: null,
                midTrip: { t1: { from: null, to: '↓ 15K へ' } },
            },
            width: 600,
        });
        expect(p.anchor).toBe('start');
        expect(p.y).toBeGreaterThan(32);
        expect(p.x).toBeGreaterThan(350);
    });
});
