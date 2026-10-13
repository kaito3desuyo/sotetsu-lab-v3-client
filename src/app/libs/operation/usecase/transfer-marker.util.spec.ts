import { OperationItineraryLinkDto } from './dtos/operation-itinerary-link.dto';
import { isTransferEnd, transferLabel } from './transfer-marker.util';

const end = (rule: 1 | 2 | 3) => ({
    tripOperationListId: 'x',
    tripId: 'x',
    operationId: 'o2',
    operationNumber: '15K',
    stationId: 's',
    rule,
});

const link = (
    patch: Partial<OperationItineraryLinkDto>,
): OperationItineraryLinkDto => ({
    tripOperationListId: 'tol1',
    tripId: 't1',
    operationId: 'o1',
    previous: null,
    next: null,
    ...patch,
});

describe('isTransferEnd', () => {
    it('終点側は next(決まり2) があれば乗り移り（depot の値は問わない）', () => {
        const links = [link({ next: end(2) })];
        expect(
            isTransferEnd({ side: 'in', tripOperationListId: 'tol1', links }),
        ).toBe(true);
        expect(
            isTransferEnd({ side: 'out', tripOperationListId: 'tol1', links }),
        ).toBe(false);
    });

    it('始点側は previous(決まり2) があれば乗り移り（depot の値は問わない）', () => {
        const links = [link({ previous: end(2) })];
        expect(isTransferEnd({ side: 'out', tripId: 't1', links })).toBe(true);
        expect(isTransferEnd({ side: 'in', tripId: 't1', links })).toBe(false);
    });

    it('決まり 2 でないつながりは乗り移りにしない', () => {
        const links = [link({ next: end(1), previous: end(3) })];
        expect(isTransferEnd({ side: 'in', tripId: 't1', links })).toBe(false);
        expect(isTransferEnd({ side: 'out', tripId: 't1', links })).toBe(false);
    });

    it('つながりが無い・別の列車なら false', () => {
        expect(isTransferEnd({ side: 'in', tripId: 't1', links: [] })).toBe(
            false,
        );
        expect(
            isTransferEnd({
                side: 'in',
                tripId: 'other',
                links: [link({ next: end(2) })],
            }),
        ).toBe(false);
    });
});

describe('transferLabel', () => {
    it('向きで文言を返す', () => {
        expect(transferLabel('in')).toBe('別の運用へ');
        expect(transferLabel('out')).toBe('別の運用から');
    });
});
