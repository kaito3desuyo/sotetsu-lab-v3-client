import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { MySummaryDto } from 'src/app/libs/user/usecase/dtos/my-summary.dto';
import { MyOperationSightingDto } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { MyPageStore } from '../stores/my-page.store';
import { MY_PAGE_SIZE, MyPageService } from './my-page.service';

function mySummary(overrides: Partial<MySummaryDto> = {}): MySummaryDto {
    return {
        sightingCount: 2,
        invalidatedCount: 0,
        firstSightingAt: '2026-11-01T01:00:00.000Z',
        lastSightingAt: '2026-11-02T01:00:00.000Z',
        corroboration: {
            corroborated: 1,
            conflicting: 0,
            uncorroborated: 1,
            invalidated: 0,
        },
        ...overrides,
    };
}

function row(
    id: string,
    createdAt = '2026-11-02T10:00:00.000Z',
): MyOperationSightingDto {
    return {
        operationSightingId: id,
        sightingTime: createdAt,
        createdAt,
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        corroboration: 'corroborated',
    };
}

describe('MyPageService', () => {
    let service: MyPageService;
    let store: InstanceType<typeof MyPageStore>;
    let userApi: { findMySummary: jest.Mock };
    let sightingApi: { findManyMine: jest.Mock };

    beforeEach(() => {
        userApi = { findMySummary: jest.fn().mockReturnValue(of(mySummary())) };
        sightingApi = {
            findManyMine: jest.fn().mockReturnValue(of([row('s1')])),
        };
        TestBed.configureTestingModule({
            providers: [
                MyPageService,
                { provide: UserService, useValue: userApi },
                { provide: OperationSightingService, useValue: sightingApi },
            ],
        });
        service = TestBed.inject(MyPageService);
        store = TestBed.inject(MyPageStore);
    });

    it('fetchMine は要約と先頭の 1 ページを入れる', () => {
        service.fetchMine().subscribe();

        expect(sightingApi.findManyMine).toHaveBeenCalledWith({
            limit: MY_PAGE_SIZE,
        });
        expect(store.summary()).toEqual(mySummary());
        expect(store.sightings()).toHaveLength(1);
        expect(store.hasFetched()).toBe(true);
        expect(store.hasMore()).toBe(false);
    });

    it('1 ページぶん満ちていれば、まだ古い目撃があるとみなす', () => {
        sightingApi.findManyMine.mockReturnValue(
            of(Array.from({ length: MY_PAGE_SIZE }, (_, i) => row(`s${i}`))),
        );

        service.fetchMine().subscribe();

        expect(store.hasMore()).toBe(true);
    });

    it('fetchNext は最後の行の createdAt を before に渡す', () => {
        store.replaceSightings(
            [
                row('s1', '2026-11-02T10:00:00.000Z'),
                row('s2', '2026-11-02T09:00:00.000Z'),
            ],
            true,
        );

        service.fetchNext().subscribe();

        expect(sightingApi.findManyMine).toHaveBeenCalledWith({
            limit: MY_PAGE_SIZE,
            before: '2026-11-02T09:00:00.000Z',
        });
    });

    it('古い世代の応答は画面に入れない', () => {
        const slow$ = new Subject<MyOperationSightingDto[]>();
        sightingApi.findManyMine.mockReturnValueOnce(slow$);
        service.fetchMine().subscribe();

        sightingApi.findManyMine.mockReturnValueOnce(of([row('new')]));
        service.fetchMine().subscribe();
        slow$.next([row('old')]);
        slow$.complete();

        expect(store.sightings().map((r) => r.operationSightingId)).toEqual([
            'new',
        ]);
    });
});
