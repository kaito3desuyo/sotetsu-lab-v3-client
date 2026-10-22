import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { of, Subject } from 'rxjs';

import { OperationPastTimeComponent } from './operation-past-time.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';

describe('OperationPastTimeComponent', () => {
    let component: OperationPastTimeComponent;
    let fixture: ComponentFixture<OperationPastTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
        OperationPastTimeStore.setIncludeInvalidated(false);
        OperationPastTimeStore.setSelectedAgencyIds([]);
        OperationPastTimeStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('fetchData: フェッチ完了で loadingQueue が空になる', async () => {
        await component.fetchData();

        expect(OperationPastTimeStore.isLoading$).toBeDefined();
    });
});

describe('OperationPastTimeComponent の取得のフラグ', () => {
    let fixture: ComponentFixture<OperationPastTimeComponent>;
    let sightings$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const hasFetched = () => {
        let value: boolean | undefined;
        OperationPastTimeStore.hasFetchedPastTime$
            .subscribe((v) => (value = v))
            .unsubscribe();
        return value;
    };

    beforeEach(async () => {
        sightings$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                reference_date: '2026-10-22',
                                days: '7',
                            }),
                        ),
                    },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => sightings$,
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        fixture.destroy();
        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
        OperationPastTimeStore.setHasFetchedPastTime(false);
        OperationPastTimeStore.resetLoading();
    });

    it('取り終わるまでは false、取り終えたら true', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        expect(hasFetched()).toBe(false);

        sightings$.next(undefined);
        sightings$.complete();
        await flush();

        expect(hasFetched()).toBe(true);
    });

    it('失敗しても true にする', async () => {
        const original = OperationPastTimeComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationPastTimeComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationPastTimeComponent) {
                return original.call(this).catch(() => undefined);
            });
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        // ネイティブの await が Promise.all に then をつなぐのを待ってから失敗させる
        await flush();

        sightings$.error(new Error('offline'));
        await flush();
        spy.mockRestore();

        expect(hasFetched()).toBe(true);
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        OperationPastTimeStore.setHasFetchedPastTime(true);
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        expect(hasFetched()).toBe(false);
    });

    it('古い取得が後から終わっても、新しい取得が終わるまで false のまま', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        const first = sightings$;
        sightings$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);

        first.next(undefined);
        first.complete();
        await flush();

        expect(hasFetched()).toBe(false);
    });
});
