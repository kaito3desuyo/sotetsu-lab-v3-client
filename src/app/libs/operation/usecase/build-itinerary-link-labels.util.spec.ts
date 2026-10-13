import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { buildItineraryLinkLabels } from './build-itinerary-link-labels.util';

const names: Record<string, string> = { ebina: '海老名', ak: '赤羽岩淵' };
const end = (p: object) =>
    ({
        tripOperationListId: 'x',
        tripId: 'x',
        operationId: 'x',
        operationNumber: '',
        stationId: 'ebina',
        rule: 2,
        ...p,
    }) as OperationItineraryLinkDto['previous'];

describe('buildItineraryLinkLabels', () => {
    it('頭と末尾の前後の運用', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-12K',
            tripIds: ['t1', 't2'],
            links: [
                {
                    tripOperationListId: 'a',
                    tripId: 't1',
                    operationId: 'op-12K',
                    previous: end({ operationNumber: '11K' }),
                    next: null,
                },
                {
                    tripOperationListId: 'b',
                    tripId: 't2',
                    operationId: 'op-12K',
                    previous: null,
                    next: end({ operationNumber: '13K' }),
                },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out).toEqual({
            from: '↓ 11K から',
            to: '↓ 13K へ',
            midTrip: {},
        });
    });

    it('列車の途中の切り替えは、その列車に「駅から 運番 へ」', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-02K',
            tripIds: ['B1818K'],
            links: [
                {
                    tripOperationListId: 'B02',
                    tripId: 'B1818K',
                    operationId: 'op-02K',
                    previous: null,
                    next: end({
                        operationNumber: '18K',
                        stationId: 'ak',
                        rule: 1,
                    }),
                },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out.midTrip).toEqual({
            B1818K: { from: null, to: '赤羽岩淵から 18K へ' },
        });
        expect(out.to).toBeNull();
    });

    it('ほかの運用のつながりは使わない', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-12K',
            tripIds: ['t1'],
            links: [
                {
                    tripOperationListId: 'z',
                    tripId: 't9',
                    operationId: 'op-99K',
                    previous: end({ operationNumber: '11K' }),
                    next: null,
                },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out).toEqual({ from: null, to: null, midTrip: {} });
    });

    it('途中の列車の出かけて戻るつながり（決まり 2）もその列車に出す', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-02K',
            tripIds: ['t1', 't2', 't3'],
            links: [
                {
                    tripOperationListId: 'a',
                    tripId: 't2',
                    operationId: 'op-02K',
                    previous: null,
                    next: end({ operationNumber: '90M' }),
                },
                {
                    tripOperationListId: 'b',
                    tripId: 't3',
                    operationId: 'op-02K',
                    previous: end({ operationNumber: '90M' }),
                    next: null,
                },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out.midTrip).toEqual({
            t2: { from: null, to: '↓ 90M へ' },
            t3: { from: '↓ 90M から', to: null },
        });
        expect(out.from).toBeNull();
        expect(out.to).toBeNull();
    });

    it('途中の列車に前も次もあればそれぞれ from と to に分ける', () => {
        const out = buildItineraryLinkLabels({
            operationId: 'op-02K',
            tripIds: ['t1', 't2', 't3'],
            links: [
                {
                    tripOperationListId: 'a',
                    tripId: 't2',
                    operationId: 'op-02K',
                    previous: end({ operationNumber: '91M' }),
                    next: end({ operationNumber: '90M' }),
                },
            ],
            stationNameById: (id) => names[id],
        });
        expect(out.midTrip).toEqual({
            t2: { from: '↓ 91M から', to: '↓ 90M へ' },
        });
    });
});
