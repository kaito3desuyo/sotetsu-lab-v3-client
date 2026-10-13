import { OperationCurrentPositionDtoBuilder } from './operation-current-position.dto.builder';

describe('OperationCurrentPositionDtoBuilder', () => {
    it('運用と前・今・次の区間を付け替え、null はそのまま返す', () => {
        const dto = OperationCurrentPositionDtoBuilder.buildFromModel({
            operation: {
                id: 'op-1',
                operationNumber: '58K',
                calendar: { id: 'c-1' },
            },
            prev: { id: 'tol-p', trip: { id: 'trip-p' } },
            current: null,
            next: { id: 'tol-n' },
            position: {
                prev: { id: 'pp' },
                current: { id: 'pc' },
                next: { id: 'pn' },
            },
        });

        expect(dto.operation).toEqual({
            operationId: 'op-1',
            operationNumber: '58K',
            calendar: { calendarId: 'c-1' },
        });
        expect(dto.prev).toEqual({
            tripOperationListId: 'tol-p',
            trip: { tripId: 'trip-p' },
        });
        expect(dto.current).toBeNull();
        expect(dto.next).toEqual({ tripOperationListId: 'tol-n' });
        expect(dto.position).toEqual({
            prev: { tripOperationListId: 'pp' },
            current: { tripOperationListId: 'pc' },
            next: { tripOperationListId: 'pn' },
        });
    });
});
