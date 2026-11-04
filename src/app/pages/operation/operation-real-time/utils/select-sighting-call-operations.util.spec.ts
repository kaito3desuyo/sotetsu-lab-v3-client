import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { selectSightingCallOperations } from './select-sighting-call-operations.util';

describe('selectSightingCallOperations', () => {
    const operation = (operationNumber: string) => ({ operationNumber });
    const running = { prev: {}, current: {}, next: {} };

    it('current があり今日の履歴が空の運用を返す', () => {
        const operations = [operation('12K'), operation('58S')];
        expect(
            selectSightingCallOperations({
                operations,
                currentPositions: {
                    '12K': { prev: null, current: {}, next: null },
                    '58S': running,
                },
                histories: { '12K': [], '58S': [] },
            }),
        ).toEqual(operations);
    });

    it('current が無くても prev と next の両方があれば（折り返しの間）返す', () => {
        const operations = [operation('12K')];
        expect(
            selectSightingCallOperations({
                operations,
                currentPositions: {
                    '12K': { prev: {}, current: null, next: {} },
                },
                histories: { '12K': [] },
            }),
        ).toEqual(operations);
    });

    it('出庫前（prev なし）・入庫後（next なし）は返さない', () => {
        expect(
            selectSightingCallOperations({
                operations: [operation('12K'), operation('58S')],
                currentPositions: {
                    '12K': { prev: null, current: null, next: {} },
                    '58S': { prev: {}, current: null, next: null },
                },
                histories: { '12K': [], '58S': [] },
            }),
        ).toEqual([]);
    });

    it('今日の履歴が 1 件でもあれば返さない', () => {
        expect(
            selectSightingCallOperations({
                operations: [operation('12K'), operation('58S')],
                currentPositions: { '12K': running, '58S': running },
                histories: { '12K': [{}], '58S': [{}, {}] },
            }),
        ).toEqual([]);
    });

    it('在線か履歴がまだ無い（キーが無い）運用は返さない', () => {
        expect(
            selectSightingCallOperations({
                operations: [
                    operation('12K'),
                    operation('58S'),
                    operation('61K'),
                    operation('70S'),
                ],
                currentPositions: {
                    // 12K: 在線が未着
                    '58S': running,
                    '61K': undefined,
                    '70S': running,
                },
                histories: {
                    '12K': [],
                    // 58S: 履歴が未着
                    '61K': [],
                    '70S': undefined,
                },
            }),
        ).toEqual([]);
    });

    it('入力の並びを保つ', () => {
        const operations = [
            operation('61K'),
            operation('12K'),
            operation('58S'),
        ];
        expect(
            selectSightingCallOperations({
                operations,
                currentPositions: {
                    '12K': running,
                    '58S': running,
                    '61K': running,
                },
                histories: { '12K': [], '58S': [], '61K': [] },
            }).map((o) => o.operationNumber),
        ).toEqual(['61K', '12K', '58S']);
    });

    it('運用番号の無い要素は返さない', () => {
        const operations: OperationDetailsDto[] = [
            { operationId: 'o1' },
            { operationId: 'o2', operationNumber: '' },
            { operationId: 'o3', operationNumber: '12K' },
        ];
        expect(
            selectSightingCallOperations({
                operations,
                currentPositions: { '12K': running, '': running },
                histories: { '12K': [], '': [] },
            }),
        ).toEqual([operations[2]]);
    });

    it('実際の OperationDetailsDto[] をキャストなしで受けられる', () => {
        const operations: OperationDetailsDto[] = [
            { operationId: 'o1', operationNumber: '12K' },
            { operationId: 'o2', operationNumber: '58S' },
        ];
        const selected: OperationDetailsDto[] = selectSightingCallOperations({
            operations,
            currentPositions: { '12K': running, '58S': running },
            histories: { '12K': [], '58S': [{}] },
        });
        expect(selected).toEqual([operations[0]]);
    });
});
