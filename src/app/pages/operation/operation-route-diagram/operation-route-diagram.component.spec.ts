import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { EMPTY, of, Subject } from 'rxjs';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';
import { OperationRouteDiagramComponent } from './operation-route-diagram.component';

describe('OperationRouteDiagramComponent', () => {
    let component: OperationRouteDiagramComponent;
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => EMPTY,
                        fetchStations: () => EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('列車の帯を押すと、その列車の全線時刻表へ移る', () => {
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.onClickNavigateTimetable({
            tripBlockId: 'block-1',
            tripDirection: ETripDirection.OUTBOUND,
        });

        expect(navigate).toHaveBeenCalledWith([
            '/timetable',
            'all-line',
            expect.objectContaining({
                trip_block_id: 'block-1',
                trip_direction: ETripDirection.OUTBOUND,
            }),
        ]);
    });

    it('途中の切り替えが 2 件あっても、列車 id で区別する', () => {
        OperationRouteDiagramStore.setOperationTrips({
            operation: { operationId: 'op-1', calendarId: 'cal-1' },
            trips: [
                { trip: { tripId: 't1', tripNumber: '1818K' } },
                { trip: { tripId: 't2', tripNumber: '1818K' } },
            ],
        } as never);
        const end = {
            tripOperationListId: 'x',
            tripId: 'x',
            operationId: 'x',
            operationNumber: '18K',
            stationId: 's',
            rule: 1,
        };
        OperationRouteDiagramStore.setItineraryLinks([
            {
                tripOperationListId: 'a',
                tripId: 't1',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
            {
                tripOperationListId: 'b',
                tripId: 't2',
                operationId: 'op-1',
                previous: null,
                next: end,
            },
        ] as never);

        const labels = component.linkLabels();

        expect(Object.keys(labels.midTrip)).toEqual(['t1', 't2']);
        expect(labels.midTrip['t1']).toEqual(labels.midTrip['t2']);
    });
});

describe('OperationRouteDiagramComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;
    let trips$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        trips$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        fixture.destroy();
        OperationRouteDiagramStore.setOperationId(null as unknown as string);
        OperationRouteDiagramStore.setHasFetchedOperationTrips(false);
        OperationRouteDiagramStore.resetLoading();
    });

    it('運用番号があって取り終わるまでは、図の骨組みを出し、空表示を出さない', async () => {
        await setup({ operation_id: 'op-1' });

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えたら骨組みを消す（成功）', async () => {
        await setup({ operation_id: 'op-1' });

        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('取り終えたら骨組みを消す（失敗しても）', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // zone.js が未処理の拒否としてテストを落とす。ここだけ本物の fetchData の失敗を受け流す
        const original = OperationRouteDiagramComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationRouteDiagramComponent.prototype, 'fetchData')
            .mockImplementation(function (
                this: OperationRouteDiagramComponent,
            ) {
                return original.call(this).catch(() => undefined);
            });
        await setup({ operation_id: 'op-1' });

        trips$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        spy.mockRestore();

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('運用番号が無ければ、骨組みでなく「運用番号を設定して検索してください」を出す', async () => {
        await setup({});

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
        expect(query('app-empty-state')).not.toBeNull();
    });

    it('取り直しが重なったとき、先に終わった古い取得は骨組みを消さない', async () => {
        await setup({ operation_id: 'op-1' });
        const firstTrips$ = trips$;
        const secondTrips$ = new Subject<undefined>();
        trips$ = secondTrips$;
        fixture.componentInstance.fetchData().catch(() => undefined);

        firstTrips$.next(undefined);
        firstTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();

        secondTrips$.next(undefined);
        secondTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('別の運用へ移って取り直すときは骨組みに戻す', async () => {
        await setup({ operation_id: 'op-1' });
        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();

        trips$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで骨組みは消えない', async () => {
        await setup({ operation_id: 'op-1' });
        const previousTrips$ = trips$;
        fixture.destroy();
        trips$ = new Subject<undefined>();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        fixture.detectChanges();

        previousTrips$.next(undefined);
        previousTrips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();

        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();
        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });
});
