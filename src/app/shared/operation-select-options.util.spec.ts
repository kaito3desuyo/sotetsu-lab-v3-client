import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import {
    findNeighborOperations,
    toOperationSelectOptions,
} from './operation-select-options.util';

const op = (operationId: string, operationNumber: string) =>
    ({ operationId, operationNumber }) as OperationDetailsDto;

describe('toOperationSelectOptions', () => {
    it('休車の 100 を除き、運用番号の順に並べる', () => {
        const result = toOperationSelectOptions([
            op('c', '43G'),
            op('x', '100'),
            op('a', '11'),
            op('b', '42G'),
        ]);
        expect(result.map((o) => o.operationNumber)).toEqual([
            '11',
            '42G',
            '43G',
        ]);
    });
});

describe('findNeighborOperations', () => {
    const list = [op('a', '11'), op('b', '42G'), op('c', '43G')];

    it('並びの 1 つ前と 1 つ後を返す', () => {
        expect(findNeighborOperations(list, 'b')).toEqual({
            prev: [{ id: 'a', label: '11' }],
            next: [{ id: 'c', label: '43G' }],
        });
    });

    it('端は片方が空、見つからなければ両方空', () => {
        expect(findNeighborOperations(list, 'a').prev).toEqual([]);
        expect(findNeighborOperations(list, 'c').next).toEqual([]);
        expect(findNeighborOperations(list, null)).toEqual({
            prev: [],
            next: [],
        });
    });

    it('一覧に無い運用（ダイヤを替えた直後など）は両方空', () => {
        expect(findNeighborOperations(list, 'z')).toEqual({
            prev: [],
            next: [],
        });
    });
});
