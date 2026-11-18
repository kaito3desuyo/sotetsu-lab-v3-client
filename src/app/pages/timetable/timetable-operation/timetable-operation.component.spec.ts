import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { TimetableOperationService } from './services/timetable-operation.service';
import {
    OperationViewKind,
    TimetableOperationStore,
} from './stores/timetable-operation.store';
import { TimetableOperationComponent } from './timetable-operation.component';

const CALENDAR = {
    calendarId: '11111111-1111-4111-8111-111111111111',
    calendarName: '平日',
    startDate: '2026-03-14',
} as never;
const OP63 = { operationId: 'op63', operationNumber: '63', calendarId: 'c' };
const TRIPS = {
    operation: OP63,
    trips: [
        {
            tripOperationListId: 'a',
            startStationId: 's1',
            endStationId: 's2',
            startTime: { departureDays: 1, departureTime: '06:00:00' },
            endTime: { arrivalDays: 1, arrivalTime: '07:00:00' },
            trip: { tripId: 'trip-a', tripNumber: '2001' },
        },
        {
            tripOperationListId: 'b',
            startStationId: 's2',
            endStationId: 's1',
            startTime: { departureDays: 1, departureTime: '15:00:00' },
            endTime: { arrivalDays: 1, arrivalTime: '16:00:00' },
            trip: { tripId: 'trip-b', tripNumber: '2002' },
        },
    ],
} as never;

/** 日本時間（UTC+9）の時刻 */
const at = (hour: number, minute = 0, day = 16): Date =>
    new Date(Date.UTC(2026, 10, day, hour - 9, minute));

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

function setup(options: {
    params: Record<string, string>;
    now?: Date;
    state?: Record<string, unknown>;
}) {
    jest.useFakeTimers({
        now: options.now ?? at(12),
        doNotFake: [...ONLY_DATE],
    });
    const socket$ = new Subject<unknown>();
    const resync$ = new Subject<void>();
    const paramMap$ = new BehaviorSubject(convertToParamMap(options.params));
    const service = {
        fetch: jest.fn(),
        refetchSightings: jest.fn(() => of(undefined)),
        fetchCurrentPosition: jest.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
        imports: [TimetableOperationComponent],
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
            {
                provide: SocketService,
                useValue: { on: () => socket$, resync: () => resync$ },
            },
            {
                provide: PageNotFound,
                useValue: { mark: jest.fn(), clear: jest.fn() },
            },
            { provide: NotificationService, useValue: { open: jest.fn() } },
        ],
    });
    TestBed.overrideComponent(TimetableOperationComponent, {
        add: {
            providers: [
                { provide: TimetableOperationService, useValue: service },
            ],
        },
    });
    const store = TestBed.inject(TimetableOperationStore);
    service.fetch.mockImplementation(
        (p: {
            operationNumber: string;
            date: string | null;
            viewKind: OperationViewKind;
        }) => {
            store.start({
                operationNumber: p.operationNumber,
                date: p.viewKind === 'calendar' ? null : p.date,
                viewKind: p.viewKind,
            });
            patchState(unprotected(store), {
                calendar: CALENDAR,
                operations: [OP63],
                trips: TRIPS,
                loaded: true,
                ...options.state,
            } as never);
            return of(undefined);
        },
    );
    const navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    const fixture: ComponentFixture<TimetableOperationComponent> =
        TestBed.createComponent(TimetableOperationComponent);
    fixture.detectChanges();
    return { fixture, store, service, navigate, socket$ };
}

const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const text = (f: ComponentFixture<unknown>) =>
    (el(f).textContent ?? '').replace(/\s+/g, ' ');

describe('TimetableOperationComponent', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('URL に date も calendar_id も無ければ今日の日付の形に置き換える', () => {
        const { navigate, service } = setup({
            params: { operation_number: '63' },
        });
        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'operation',
                { operation_number: '63', date: '2026-11-16' },
            ],
            { replaceUrl: true },
        );
        expect(service.fetch).not.toHaveBeenCalled();
    });

    it('0 時〜4 時は前の営業日を今日にする', () => {
        const { navigate } = setup({
            params: { operation_number: '63' },
            now: at(0, 50, 17),
        });
        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'operation',
                { operation_number: '63', date: '2026-11-16' },
            ],
            { replaceUrl: true },
        );
    });

    it('先の日の date は今日に直す', () => {
        const { navigate } = setup({
            params: { operation_number: '63', date: '2026-11-20' },
        });
        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'operation',
                { operation_number: '63', date: '2026-11-16' },
            ],
            { replaceUrl: true },
        );
    });

    it('date と calendar_id が両方あれば date を使う', () => {
        const { service } = setup({
            params: {
                operation_number: '63',
                date: '2026-11-10',
                calendar_id: '22222222-2222-4222-8222-222222222222',
            },
        });
        expect(service.fetch).toHaveBeenCalledWith(
            expect.objectContaining({
                date: '2026-11-10',
                calendarId: null,
                viewKind: 'past',
            }),
        );
    });

    it('calendar_id だけならダイヤの形で取り、編成・目撃の欄を出さない', () => {
        const { service, fixture } = setup({
            params: {
                operation_number: '63',
                calendar_id: '11111111-1111-4111-8111-111111111111',
            },
            state: { inferredFormationNumber: '8708' },
        });
        fixture.detectChanges();
        expect(service.fetch).toHaveBeenCalledWith(
            expect.objectContaining({
                calendarId: '11111111-1111-4111-8111-111111111111',
                viewKind: 'calendar',
            }),
        );
        expect(
            el(fixture).querySelector('[data-testid="current-formation"]'),
        ).toBeNull();
        expect(
            el(fixture).querySelector('[data-testid="trip-list"]'),
        ).not.toBeNull();
        expect(text(fixture)).not.toContain('8708');
    });

    it('今日は、いまの編成を「?」付きで出す', () => {
        const { fixture } = setup({
            params: { operation_number: '63', date: '2026-11-16' },
            state: { inferredFormationNumber: '8708' },
        });
        fixture.detectChanges();
        const current = el(fixture).querySelector(
            '[data-testid="current-formation"]',
        );
        expect(current?.textContent?.replace(/\s+/g, '')).toBe(
            'いまの編成8708?',
        );
    });

    it('今日を開いたまま 4 時を越えても、読み込み中のまま止まらず列車を出し続ける', () => {
        const { fixture } = setup({
            params: { operation_number: '63', date: '2026-11-16' },
        });
        fixture.detectChanges();
        expect(
            el(fixture).querySelector('[data-testid="trip-list"]'),
        ).not.toBeNull();

        fixture.componentInstance.now.set(at(4, 10, 17));
        fixture.detectChanges();

        expect(
            el(fixture).querySelector('[data-testid="trip-list"]'),
        ).not.toBeNull();
        expect(
            el(fixture).querySelector('[data-testid="current-formation"]'),
        ).toBeNull();
    });

    it('今日で編成が分からなければ「編成不明」', () => {
        const { fixture } = setup({
            params: { operation_number: '63', date: '2026-11-16' },
        });
        fixture.detectChanges();
        expect(
            el(fixture).querySelector('[data-testid="current-formation"]')
                ?.textContent,
        ).toContain('編成不明');
    });

    it('運用が無ければ「この日のダイヤに 63 運用はありません」を出し、操作帯は出す', () => {
        const { fixture } = setup({
            params: { operation_number: '63', date: '2026-11-10' },
            state: { operations: [] },
        });
        fixture.detectChanges();
        expect(text(fixture)).toContain('この日のダイヤに 63 運用はありません');
        expect(
            el(fixture).querySelector('app-timetable-operation-controls'),
        ).not.toBeNull();
    });

    it('列車を持たない運用（休車 100）は「この運用に列車はありません」', () => {
        const { fixture } = setup({
            params: { operation_number: '100', date: '2026-11-10' },
            state: {
                operations: [{ ...OP63, operationNumber: '100' }],
                trips: { operation: OP63, trips: [] },
            },
        });
        fixture.detectChanges();
        expect(text(fixture)).toContain('この運用に列車はありません');
    });

    it('socket の合図は今日だけ取り直す', () => {
        const past = setup({
            params: { operation_number: '63', date: '2026-11-10' },
        });
        past.socket$.next({ data: JSON.stringify({ type: 'sighting' }) });
        expect(past.service.refetchSightings).not.toHaveBeenCalled();
        TestBed.resetTestingModule();
        const today = setup({
            params: { operation_number: '63', date: '2026-11-16' },
        });
        today.socket$.next({ data: JSON.stringify({ type: 'sighting' }) });
        expect(today.service.refetchSightings).toHaveBeenCalled();
    });

    it('運用行路図へのリンクがある', () => {
        const { fixture } = setup({
            params: { operation_number: '63', date: '2026-11-10' },
        });
        fixture.detectChanges();
        const a = el(fixture).querySelector<HTMLAnchorElement>(
            '[data-testid="route-diagram-link"]',
        );
        expect(a?.getAttribute('href')).toBe(
            '/operation/route-diagram;operation_id=op63',
        );
    });

    it('運用番号を替えると、今の日付のまま移る', () => {
        const { fixture, navigate } = setup({
            params: { operation_number: '63', date: '2026-11-10' },
        });
        fixture.componentInstance.onOperationNumberChange('64');
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'operation',
            { operation_number: '64', date: '2026-11-10' },
        ]);
    });

    it('「ダイヤで見る」で、見ている日のダイヤの形へ移る', () => {
        const { fixture, navigate } = setup({
            params: { operation_number: '63', date: '2026-11-10' },
        });
        fixture.componentInstance.onViewByCalendar();
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'operation',
            {
                operation_number: '63',
                calendar_id: '11111111-1111-4111-8111-111111111111',
            },
        ]);
    });

    it('読めない日付は見つからない表示', () => {
        const { fixture, service } = setup({
            params: { operation_number: '63', date: '2026-13-40' },
        });
        fixture.detectChanges();
        expect(
            el(fixture).querySelector('app-not-found-content'),
        ).not.toBeNull();
        expect(service.fetch).not.toHaveBeenCalled();
    });
});
