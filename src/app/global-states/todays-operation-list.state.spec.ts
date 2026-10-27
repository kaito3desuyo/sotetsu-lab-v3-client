import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OperationDetailsDto } from '../libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from '../libs/operation/usecase/operation.service';
import { setTodaysCalendars } from './testing/set-todays-calendars';
import { TodaysOperationListState } from './todays-operation-list.state';

const operation = (
    operationId: string,
    operationNumber: string,
): OperationDetailsDto =>
    ({ operationId, operationNumber }) as OperationDetailsDto;

describe('TodaysOperationListState', () => {
    let findManyByCalendarId: jest.Mock;
    let store: InstanceType<typeof TodaysOperationListState>;

    beforeEach(() => {
        findManyByCalendarId = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: OperationService,
                    useValue: { findManyByCalendarId },
                },
            ],
        });
        store = TestBed.inject(TodaysOperationListState);
        setTodaysCalendars(['today']);
    });

    it('取る前は空', () => {
        expect(store.todaysOperations()).toEqual([]);
        expect(store.todaysOperationsSorted()).toEqual([]);
    });

    it('今日のダイヤの ID で取る', () => {
        findManyByCalendarId.mockReturnValue(of([]));

        store.fetch().subscribe();

        expect(findManyByCalendarId).toHaveBeenCalledWith({
            calendarId: 'today',
        });
    });

    it('fetch に渡した順のまま返る（ID の順に並べ替えない）', () => {
        findManyByCalendarId.mockReturnValue(
            of([operation('c', '3'), operation('a', '1'), operation('b', '2')]),
        );

        store.fetch().subscribe();

        expect(store.todaysOperations().map((o) => o.operationId)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('運用番号 100（休車）は入れない', () => {
        findManyByCalendarId.mockReturnValue(
            of([operation('x', '100'), operation('a', '1')]),
        );

        store.fetch().subscribe();

        expect(store.todaysOperations().map((o) => o.operationId)).toEqual([
            'a',
        ]);
    });

    it('todaysOperationsSorted は運用番号の順（数字だけの番号の後ろに G、K の順）', () => {
        findManyByCalendarId.mockReturnValue(
            of([
                operation('k', '21K'),
                operation('g', '41G'),
                operation('n2', '12'),
                operation('n1', '2'),
            ]),
        );

        store.fetch().subscribe();

        expect(
            store.todaysOperationsSorted().map((o) => o.operationNumber),
        ).toEqual(['2', '12', '41G', '21K']);
        // 元の並びは変わらない
        expect(store.todaysOperations().map((o) => o.operationId)).toEqual([
            'k',
            'g',
            'n2',
            'n1',
        ]);
    });
});
