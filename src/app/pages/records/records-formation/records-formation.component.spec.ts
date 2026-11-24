import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { CalendarDateService } from 'src/app/libs/calendar/usecase/calendar-date.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RecordsFormationComponent } from './records-formation.component';
import { RecordsFormationService } from './services/records-formation.service';
import { RecordsFormationStore } from './stores/records-formation.store';

/** 営業日は日本時間で 4 時区切りなので、日本時間（UTC+9）の時刻で組む */
const at = (month: number, day: number, hour = 15): Date =>
    new Date(Date.UTC(2026, month - 1, day, hour - 9));

const ONLY_DATE = [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
] as const;

const FORMATIONS = [
    {
        formationId: 'f1',
        formationNumber: '10701',
        agencyId: 's',
        vehicleType: '10000',
    },
];

const sighting = (
    id: string,
    sightingTime: string,
    operationNumber: string,
    extra: Record<string, unknown> = {},
) => ({
    operationSightingId: id,
    formationId: 'f1',
    sightingTime,
    operationId: `op-${operationNumber}`,
    operation: { operationId: `op-${operationNumber}`, operationNumber },
    ...extra,
});

function setup(options: {
    params: Record<string, string>;
    now?: Date;
    sightings?: unknown[];
    formations?: unknown[];
    server?: boolean;
    findMany?: () => Observable<unknown[]>;
    summaryFails?: boolean;
    formationRows?: unknown[];
    calendarDates?: unknown[];
}) {
    jest.useFakeTimers({
        now: options.now ?? at(11, 19),
        doNotFake: [...ONLY_DATE],
    });
    const paramMap$ = new BehaviorSubject(convertToParamMap(options.params));
    const api = {
        findManyBySpecificPeriod: jest.fn(
            options.findMany ?? (() => of(options.sightings ?? [])),
        ),
        findOneTimeCrossSectionByFormationNumber: jest.fn(() =>
            options.summaryFails
                ? throwError(() => new Error('summary failed'))
                : of({ latestSighting: null, expectedSighting: null }),
        ),
    };
    const formationApi = {
        findManyBySpecificPeriod: jest.fn(() =>
            of(options.formationRows ?? []),
        ),
    };
    const calendarApi = {
        findMany: jest.fn(() => of(options.calendarDates ?? [])),
    };
    TestBed.configureTestingModule({
        imports: [RecordsFormationComponent],
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
            { provide: OperationSightingService, useValue: api },
            { provide: FormationService, useValue: formationApi },
            { provide: CalendarDateService, useValue: calendarApi },
            { provide: NotificationService, useValue: { open: jest.fn() } },
            ...(options.server
                ? [{ provide: PLATFORM_ID, useValue: 'server' }]
                : []),
        ],
    });
    TestBed.overrideComponent(RecordsFormationComponent, {
        add: { providers: [RecordsFormationService] },
    });
    patchState(
        unprotected(TestBed.inject(TodaysFormationListState)),
        setAllEntities(
            (options.formations ?? FORMATIONS) as never[],
            {
                selectId: (f: { formationId: string }) => f.formationId,
            } as never,
        ),
    );
    const navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    const fixture: ComponentFixture<RecordsFormationComponent> =
        TestBed.createComponent(RecordsFormationComponent);
    fixture.detectChanges();
    return {
        fixture,
        api,
        formationApi,
        calendarApi,
        navigate,
        paramMap$,
        store: TestBed.inject(RecordsFormationStore),
    };
}

const el = (f: ComponentFixture<unknown>): HTMLElement => f.nativeElement;
const q = (f: ComponentFixture<unknown>, selector: string) =>
    el(f).querySelector<HTMLElement>(selector);

describe('RecordsFormationComponent', () => {
    afterEach(() => jest.useRealTimers());

    it('month が無ければ今の月を取る', () => {
        const { api } = setup({ params: { formation_number: '10701' } });
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledWith({
            from: '2026-11-01',
            to: '2026-11-30',
            formationNumber: '10701',
            includeCarriedOver: true,
        });
    });

    it('壊れた month（2026-13）は今の月として取る', () => {
        const { api } = setup({
            params: { formation_number: '10701', month: '2026-13' },
        });
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({ from: '2026-11-01', to: '2026-11-30' }),
        );
    });

    it('前の月のボタンで URL の month が 2026-10 になる', () => {
        const { fixture, navigate } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        q(fixture, '[data-testid="prev-month"]')!.click();
        expect(navigate).toHaveBeenCalledWith([
            'records',
            'formation',
            { formation_number: '10701', month: '2026-10' },
        ]);
    });

    it('今の月なら次の月のボタンは無効', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        expect(
            (q(fixture, '[data-testid="next-month"]') as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });

    it('前の月なら次の月のボタンで今の月へ進める', () => {
        const { fixture, navigate } = setup({
            params: { formation_number: '10701', month: '2026-10' },
        });
        q(fixture, '[data-testid="next-month"]')!.click();
        expect(navigate).toHaveBeenCalledWith([
            'records',
            'formation',
            { formation_number: '10701', month: '2026-11' },
        ]);
    });

    it('目撃のある日のマスはその日の編成別時刻表へのリンクになり、無い日はリンクにならない', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            // 日本時間 11/05 10:00
            sightings: [sighting('a', '2026-11-05T01:00:00Z', '71')],
        });
        const linked = q(fixture, '[data-date="2026-11-05"]')!;
        expect(linked).toHaveAttribute(
            'href',
            '/timetable/formation;formation_number=10701;date=2026-11-05',
        );
        expect(q(fixture, '[data-date="2026-11-06"]')!).not.toHaveAttribute(
            'href',
        );
    });

    it('推定の目撃（同日引き継ぎの写し）の運番には「?」が付く', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            sightings: [
                sighting('a', '2026-11-05T01:00:00Z', '73', {
                    carriedFromSightingId: 'x',
                    sightedAsOperation: {
                        operationId: 'o',
                        operationNumber: '71',
                    },
                }),
            ],
        });
        expect(q(fixture, '[data-date="2026-11-05"]')).toHaveTextContent(
            /73\?/,
        );
    });

    it('遅れて届いた前の月の結果で表示を上書きしない', () => {
        const old$ = new Subject<unknown[]>();
        const latest$ = new Subject<unknown[]>();
        const queue = [old$, latest$];
        const { fixture, paramMap$, api } = setup({
            params: { formation_number: '10701', month: '2026-10' },
            findMany: () => queue.shift()!,
        });
        paramMap$.next(
            convertToParamMap({ formation_number: '10701', month: '2026-11' }),
        );
        latest$.next([sighting('new', '2026-11-05T01:00:00Z', '71')]);
        latest$.complete();
        old$.next([sighting('old', '2026-10-05T01:00:00Z', '99')]);
        old$.complete();
        fixture.detectChanges();
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledTimes(2);
        expect(el(fixture)).toHaveTextContent('71');
        expect(el(fixture)).not.toHaveTextContent('99');
    });

    it('編成番号が無ければ案内だけを出す', () => {
        const { fixture, api } = setup({ params: {} });
        expect(el(fixture)).toHaveTextContent('編成番号を入力してください');
        expect(q(fixture, '[data-testid="records-calendar"]')).toBeNull();
        expect(api.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });

    it('今日の編成に無い番号（引退した編成）でも取得してカレンダーを出す', () => {
        const { fixture, api } = setup({
            params: { formation_number: '7710', month: '2026-11' },
            sightings: [sighting('a', '2026-11-05T01:00:00Z', '71')],
        });
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({ formationNumber: '7710' }),
        );
        expect(q(fixture, '[data-testid="records-calendar"]')).not.toBeNull();
        expect(el(fixture)).not.toHaveTextContent('編成が見つかりません');
    });

    it('編成の一覧が空でも、番号があれば取得する', () => {
        const { api } = setup({
            params: { formation_number: '10701' },
            formations: [],
        });
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledTimes(1);
    });

    it('欄に打った今日の編成に無い番号で、その番号のページへ移動して取得する', () => {
        const { fixture, navigate, paramMap$, api } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        const input = q(
            fixture,
            '[data-testid="formation-number-input"]',
        ) as HTMLInputElement;
        input.dispatchEvent(new Event('focusin'));
        input.value = '7710';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(navigate).toHaveBeenCalledWith([
            'records',
            'formation',
            { formation_number: '7710', month: '2026-11' },
        ]);
        paramMap$.next(
            convertToParamMap({ formation_number: '7710', month: '2026-11' }),
        );
        expect(api.findManyBySpecificPeriod).toHaveBeenLastCalledWith(
            expect.objectContaining({ formationNumber: '7710' }),
        );
    });

    it('目撃 0 の月は空のカレンダーに「この月の目撃はありません」を添える', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            sightings: [],
        });
        expect(el(fixture)).toHaveTextContent('この月の目撃はありません');
        expect(q(fixture, '[data-testid="records-calendar"]')).not.toBeNull();
    });

    it('要約は月を替えても取り直さない', () => {
        const { api, paramMap$ } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        paramMap$.next(
            convertToParamMap({ formation_number: '10701', month: '2026-10' }),
        );
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledTimes(2);
        expect(
            api.findOneTimeCrossSectionByFormationNumber,
        ).toHaveBeenCalledTimes(1);
    });

    it('要約で一度も目撃が無ければ「目撃の記録はありません」を出す', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        expect(el(fixture)).toHaveTextContent('目撃の記録はありません');
    });

    it('要約の取得に失敗したら「最新の目撃を読み込めませんでした」を出し、カレンダーは残す', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            summaryFails: true,
        });
        expect(q(fixture, '[data-testid="summary-error"]')).toHaveTextContent(
            '最新の目撃を読み込めませんでした',
        );
        expect(q(fixture, '[data-testid="records-calendar"]')).not.toBeNull();
    });

    it('サーバーでは取得しない', () => {
        const { api } = setup({
            params: { formation_number: '10701' },
            server: true,
        });
        expect(api.findManyBySpecificPeriod).not.toHaveBeenCalled();
    });

    it('4 時前は前の日の月として扱う（11/1 の 2 時は 10 月）', () => {
        const { api } = setup({
            params: { formation_number: '10701' },
            now: at(11, 1, 2),
        });
        expect(api.findManyBySpecificPeriod).toHaveBeenCalledWith(
            expect.objectContaining({ from: '2026-10-01', to: '2026-10-31' }),
        );
    });

    it('編成の全期間を include 付きで取り、編成の情報のカードを出す', () => {
        const { fixture, formationApi } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            formationRows: [
                {
                    formationNumber: '10701',
                    vehicleType: '10000',
                    startDate: null,
                    endDate: null,
                    agency: { agencyName: '相鉄' },
                    vehicleFormations: [
                        {
                            carNumber: 1,
                            vehicle: {
                                vehicleNumber: '10701',
                                modifications: [
                                    {
                                        modifiedOn: null,
                                        kind: 'livery',
                                        value: '10000-ynb',
                                        description: null,
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        });
        expect(formationApi.findManyBySpecificPeriod).toHaveBeenCalledWith({
            startDate: '2000-01-01',
            endDate: '2026-11-19',
            include: 'vehicleFormations.vehicle.modifications,agency',
        });
        expect(q(fixture, '[data-testid="records-info"]')).toHaveTextContent(
            '10701',
        );
        expect(q(fixture, '[data-testid="annotation"]')).toHaveTextContent(
            '10000・相鉄',
        );
        expect(q(fixture, '[data-testid="info-history"]')).toBeNull();
        expect(
            q(fixture, '[data-testid="info-modifications"]'),
        ).toHaveTextContent('10000 の YNB');
    });

    it('編成の期間が取れなければ編成の情報のカードを出さない', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            formationRows: [],
        });
        expect(q(fixture, '[data-testid="records-info"]')).toBeNull();
    });

    it('月を替えると祝日だけ取り直し、編成の期間は取り直さない', () => {
        const { formationApi, calendarApi, paramMap$ } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        expect(calendarApi.findMany).toHaveBeenCalledWith({
            from: '2026-11-01',
            to: '2026-11-30',
        });
        paramMap$.next(
            convertToParamMap({ formation_number: '10701', month: '2026-10' }),
        );
        expect(calendarApi.findMany).toHaveBeenCalledTimes(2);
        expect(calendarApi.findMany).toHaveBeenLastCalledWith({
            from: '2026-10-01',
            to: '2026-10-31',
        });
        expect(formationApi.findManyBySpecificPeriod).toHaveBeenCalledTimes(1);
    });

    it('編成番号が変わったら編成の期間を取り直す', () => {
        const { formationApi, paramMap$ } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        paramMap$.next(
            convertToParamMap({ formation_number: '7710', month: '2026-11' }),
        );
        expect(formationApi.findManyBySpecificPeriod).toHaveBeenCalledTimes(2);
    });

    it('祝日がカレンダーに赤で出る（11/3 は文化の日）', () => {
        const { fixture } = setup({
            params: { formation_number: '10701', month: '2026-11' },
            calendarDates: [
                { calendarDateId: 'c', date: '2026-11-03', memo: '文化の日' },
            ],
        });
        expect(q(fixture, '[data-date="2026-11-03"]')).toHaveTextContent(
            '文化の日',
        );
    });

    it('カレンダーの上端の送りで前の月へ移動する', () => {
        const { fixture, navigate } = setup({
            params: { formation_number: '10701', month: '2026-11' },
        });
        q(fixture, '[data-testid="calendar-prev"]')!.click();
        expect(navigate).toHaveBeenCalledWith([
            'records',
            'formation',
            { formation_number: '10701', month: '2026-10' },
        ]);
    });

    it('サーバーでは編成の期間と祝日も取らない', () => {
        const { formationApi, calendarApi } = setup({
            params: { formation_number: '10701' },
            server: true,
        });
        expect(formationApi.findManyBySpecificPeriod).not.toHaveBeenCalled();
        expect(calendarApi.findMany).not.toHaveBeenCalled();
    });
});
