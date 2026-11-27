import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RecordsFormationStore } from '../stores/records-formation.store';
import { RecordsFormationService } from './records-formation.service';

function setup() {
    const api = {
        findManyBySpecificPeriod: jest.fn(),
        findOneTimeCrossSectionByFormationNumber: jest.fn(),
    };
    TestBed.configureTestingModule({
        providers: [
            RecordsFormationService,
            { provide: OperationSightingService, useValue: api },
        ],
    });
    return {
        api,
        store: TestBed.inject(RecordsFormationStore),
        service: TestBed.inject(RecordsFormationService),
    };
}

describe('RecordsFormationService', () => {
    it('月の目撃を、推定込み・編成番号つきで 1 回取る', async () => {
        const { api, store, service } = setup();
        const items = [{ operationSightingId: 'a' }];
        api.findManyBySpecificPeriod.mockReturnValue(of(items));
        await new Promise<void>((resolve) =>
            service
                .fetchMonth({ formationNumber: '10701', month: '2026-11' })
                .subscribe({ complete: resolve }),
        );
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledTimes(1);
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledWith({
            from: '2026-11-01',
            to: '2026-11-30',
            formationNumber: '10701',
            includeCarriedOver: true,
        });
        expect(store.sightings()).toEqual(items);
        expect(store.loaded()).toBe(true);
        expect(store.isLoading()).toBe(false);
    });

    it('遅れて届いた前の月の結果で上書きしない', () => {
        const { api, store, service } = setup();
        const old$ = new Subject<unknown[]>();
        const latest$ = new Subject<unknown[]>();
        api.findManyBySpecificPeriod
            .mockReturnValueOnce(old$)
            .mockReturnValueOnce(latest$);
        service
            .fetchMonth({ formationNumber: '10701', month: '2026-10' })
            .subscribe();
        service
            .fetchMonth({ formationNumber: '10701', month: '2026-11' })
            .subscribe();
        latest$.next([{ operationSightingId: 'new' }]);
        latest$.complete();
        old$.next([{ operationSightingId: 'old' }]);
        old$.complete();
        expect(store.month()).toBe('2026-11');
        expect(store.sightings().map((s) => s.operationSightingId)).toEqual([
            'new',
        ]);
        expect(store.isLoading()).toBe(false);
    });

    it('取得に失敗したら loadError を立てる', () => {
        const { api, store, service } = setup();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        api.findManyBySpecificPeriod.mockReturnValue(
            throwError(() => new Error('x')),
        );
        service
            .fetchMonth({ formationNumber: '10701', month: '2026-11' })
            .subscribe();
        expect(store.loadError()).toBe(true);
        expect(store.loaded()).toBe(true);
    });

    it('要約を取って、編成番号とともにストアへ置く', () => {
        const { api, store, service } = setup();
        store.startMonth({ formationNumber: '10701', month: '2026-11' });
        const summary = { latestSighting: null, expectedSighting: null };
        api.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of(summary),
        );
        service.fetchSummary({ formationNumber: '10701' }).subscribe();
        expect(store.summary()).toBe(summary);
        expect(store.summaryFormationNumber()).toBe('10701');
    });

    it('編成が替わったあとに届いた前の編成の要約は捨てる', () => {
        const { api, store, service } = setup();
        store.startMonth({ formationNumber: '10702', month: '2026-11' });
        api.findOneTimeCrossSectionByFormationNumber.mockReturnValue(
            of({ latestSighting: null, expectedSighting: null }),
        );
        service.fetchSummary({ formationNumber: '10701' }).subscribe();
        expect(store.summaryFormationNumber()).toBeNull();
    });
});
