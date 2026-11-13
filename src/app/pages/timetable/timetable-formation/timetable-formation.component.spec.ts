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
import { unprotected } from '@ngrx/signals/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { TimetableFormationService } from './services/timetable-formation.service';
import { TimetableFormationStore } from './stores/timetable-formation.store';
import { TimetableFormationComponent } from './timetable-formation.component';

type StoreState = Record<string, unknown>;

const FORMATION = { formationId: 'f1', formationNumber: '8713' } as never;
const CALENDAR = { calendarId: 'c1' } as never;

/** 営業日は日本時間で 4 時区切りなので、日本時間（UTC+9）の時刻で組む */
const at = (hour: number, minute = 0, day = 11): Date =>
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
    server?: boolean;
    state?: StoreState;
}) {
    jest.useFakeTimers({
        now: options.now ?? at(15),
        doNotFake: [...ONLY_DATE],
    });
    const socket$ = new Subject<unknown>();
    const paramMap$ = new BehaviorSubject(convertToParamMap(options.params));
    const service = {
        fetchDay: jest.fn(),
        refetchSightings: jest.fn(() => of(undefined)),
        fetchCurrentPosition: jest.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
        imports: [TimetableFormationComponent],
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
            { provide: SocketService, useValue: { on: () => socket$ } },
            { provide: NotificationService, useValue: { open: jest.fn() } },
            {
                provide: OperationPostDialogService,
                useValue: { open: jest.fn() },
            },
            ...(options.server
                ? [{ provide: PLATFORM_ID, useValue: 'server' }]
                : []),
        ],
    });
    TestBed.overrideComponent(TimetableFormationComponent, {
        add: {
            providers: [
                { provide: TimetableFormationService, useValue: service },
            ],
        },
    });
    const store = TestBed.inject(TimetableFormationStore);
    service.fetchDay.mockImplementation(
        (p: {
            formationNumber: string;
            date: string;
            dateKind: 'past' | 'today' | 'tomorrow';
        }) => {
            store.startDay({
                formationNumber: p.formationNumber,
                date: p.date,
                dateKind: p.dateKind,
            });
            patchState(unprotected(store), {
                formation: FORMATION,
                calendar: CALENDAR,
                loaded: true,
                ...options.state,
            } as never);
            return of(undefined);
        },
    );
    const navigate = jest
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);
    const fixture: ComponentFixture<TimetableFormationComponent> =
        TestBed.createComponent(TimetableFormationComponent);
    fixture.detectChanges();
    return { fixture, store, service, navigate, socket$, paramMap$ };
}

const text = (f: ComponentFixture<unknown>): string =>
    (f.nativeElement as HTMLElement).textContent ?? '';
const q = <T extends HTMLElement>(
    f: ComponentFixture<unknown>,
    selector: string,
): T | null => (f.nativeElement as HTMLElement).querySelector<T>(selector);

describe('TimetableFormationComponent', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    describe('URL の補い', () => {
        it('date が無ければブラウザで今日を補い replaceUrl で書き直す', () => {
            const { navigate, service } = setup({
                params: { formation_number: '8713' },
            });
            expect(navigate).toHaveBeenCalledWith(
                [
                    'timetable',
                    'formation',
                    { formation_number: '8713', date: '2026-11-11' },
                ],
                { replaceUrl: true },
            );
            expect(service.fetchDay).not.toHaveBeenCalled();
        });

        it('サーバーでは date を補わず、取得もしない', () => {
            const { navigate, service } = setup({
                params: { formation_number: '8713' },
                server: true,
            });
            expect(navigate).not.toHaveBeenCalled();
            expect(service.fetchDay).not.toHaveBeenCalled();
        });

        it('3:30 に開いたら前の日を補う', () => {
            const { navigate } = setup({
                params: { formation_number: '8713' },
                now: at(3, 30),
            });
            expect(navigate).toHaveBeenCalledWith(
                [
                    'timetable',
                    'formation',
                    { formation_number: '8713', date: '2026-11-10' },
                ],
                { replaceUrl: true },
            );
        });

        it('読めない date と明後日より先の date は今日に置き換える', () => {
            const a = setup({
                params: { formation_number: '8713', date: 'undefined' },
            });
            expect(a.navigate).toHaveBeenCalledTimes(1);
            TestBed.resetTestingModule();
            const b = setup({
                params: { formation_number: '8713', date: '2026-11-13' },
            });
            expect(b.navigate).toHaveBeenCalledWith(
                [
                    'timetable',
                    'formation',
                    { formation_number: '8713', date: '2026-11-11' },
                ],
                { replaceUrl: true },
            );
        });

        it('formation_number を変えたら URL を書き直す', () => {
            const { fixture, navigate } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            fixture.componentInstance.onFormationSubmit(' 8714 ');
            expect(navigate).toHaveBeenCalledWith([
                'timetable',
                'formation',
                { formation_number: '8714', date: '2026-11-11' },
            ]);
        });
    });

    describe('取得', () => {
        it('今日・明日・過去の日の種類を決めて取る', () => {
            const today = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            expect(today.service.fetchDay).toHaveBeenCalledWith({
                formationNumber: '8713',
                date: '2026-11-11',
                dateKind: 'today',
            });
            TestBed.resetTestingModule();
            const past = setup({
                params: { formation_number: '8713', date: '2026-11-01' },
            });
            expect(past.service.fetchDay).toHaveBeenCalledWith(
                expect.objectContaining({ dateKind: 'past' }),
            );
            TestBed.resetTestingModule();
            const tomorrow = setup({
                params: { formation_number: '8713', date: '2026-11-12' },
            });
            expect(tomorrow.service.fetchDay).toHaveBeenCalledWith(
                expect.objectContaining({ dateKind: 'tomorrow' }),
            );
        });
    });

    describe('操作帯', () => {
        it('操作部は操作帯に載せ、要約の行に編成と日付を出す', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            fixture.detectChanges();
            const band = q(fixture, 'app-control-band');
            expect(band).not.toBeNull();
            expect(
                band?.querySelector('[data-testid="formation-number-input"]'),
            ).not.toBeNull();
            expect(
                q(fixture, '[data-testid="control-band-summary"]')?.textContent,
            ).toBe('8713 11/11（今日） 絞り込み：なし');
        });

        it('編成を開いたあと番号の無い URL へ移っても、前の編成のカード・駅の欄・解除を出さない', () => {
            const { fixture, store, paramMap$ } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            store.setSelectedStationId('st1');
            fixture.detectChanges();
            expect(
                q(fixture, '[data-testid="formation-header"]'),
            ).not.toBeNull();
            expect(
                q(fixture, '[data-testid="control-band-clear"]'),
            ).not.toBeNull();

            paramMap$.next(convertToParamMap({}));
            fixture.detectChanges();
            expect(q(fixture, '[data-testid="formation-header"]')).toBeNull();
            expect(q(fixture, '[data-testid="control-band-clear"]')).toBeNull();
            expect(text(fixture)).not.toContain('駅で絞る');
        });

        it('編成番号が無いときは、入れるボタンで操作帯を開く', () => {
            const { fixture } = setup({ params: {} });
            fixture.detectChanges();
            expect(text(fixture)).toContain('編成番号を入れてください');
            q<HTMLButtonElement>(fixture, 'app-empty-state button')?.click();
            fixture.detectChanges();
            expect(
                q(fixture, '[data-testid="control-band-toggle"]')?.getAttribute(
                    'aria-expanded',
                ),
            ).toBe('true');
        });
    });

    describe('日付の操作', () => {
        // 前後の日は名前付きのボタン（app-step-nav。docs/design.md「前後へ送る」）。送れない向きのボタンは出さない
        const stepButton = (
            f: ComponentFixture<unknown>,
            icon: 'chevron_left' | 'chevron_right',
        ) =>
            Array.from(
                (
                    f.nativeElement as HTMLElement
                ).querySelectorAll<HTMLButtonElement>('app-step-nav button'),
            ).find((b) => b.textContent?.includes(icon));
        const nextButton = (f: ComponentFixture<unknown>) =>
            stepButton(f, 'chevron_right');

        it('明後日へ進むボタンは出さない', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-12' },
            });
            fixture.detectChanges();
            expect(nextButton(fixture)).toBeUndefined();
        });

        it('明日を選べるときだけ、今日の次の日ボタンを日付の名前で出す', () => {
            const blocked = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
                state: { tomorrowOperationId: null },
            });
            blocked.fixture.detectChanges();
            expect(nextButton(blocked.fixture)).toBeUndefined();
            TestBed.resetTestingModule();
            const open = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
                state: { tomorrowOperationId: 'op56' },
            });
            open.fixture.detectChanges();
            expect(nextButton(open.fixture)?.textContent).toContain('11/12');
        });

        it('明日を選べないときは理由が出る', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
                state: { tomorrowOperationId: null },
            });
            fixture.detectChanges();
            expect(text(fixture)).toContain(
                '順送りで明日の運用が決まらないので、明日は選べません。',
            );
        });

        it('前の日ボタンで 1 日戻る', () => {
            const { fixture, navigate } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            fixture.detectChanges();
            const prev = stepButton(fixture, 'chevron_left');
            expect(prev?.textContent).toContain('11/10');
            prev?.click();
            expect(navigate).toHaveBeenCalledWith([
                'timetable',
                'formation',
                { formation_number: '8713', date: '2026-11-10' },
            ]);
        });
    });

    describe('文言', () => {
        it('編成が無い日は「この日の編成に … はありません」を出す', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-01' },
                state: { formation: null },
            });
            fixture.detectChanges();
            expect(text(fixture)).toContain('この日の編成に 8713 はありません');
        });

        it('ダイヤが無い日は「この日のダイヤはありません」を出す', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-01' },
                state: { calendar: null },
            });
            fixture.detectChanges();
            expect(text(fixture)).toContain('この日のダイヤはありません');
        });

        it('目撃が無く列車が並ばない日は「この日の目撃はありません」を出す', () => {
            const { fixture } = setup({
                params: { formation_number: '8713', date: '2026-11-01' },
            });
            fixture.detectChanges();
            expect(text(fixture)).toContain('この日の目撃はありません');
        });

        it('取得に失敗したら読み込めませんでした、と再読み込みを出す', () => {
            const { fixture, service } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
                state: { loadError: true },
            });
            fixture.detectChanges();
            expect(text(fixture)).toContain('読み込めませんでした');
            expect(text(fixture)).toContain(
                '通信の状態を確かめて、もう一度お試しください。',
            );
            service.fetchDay.mockClear();
            fixture.componentInstance.reload();
            expect(service.fetchDay).toHaveBeenCalledWith(
                expect.objectContaining({ forceReload: true }),
            );
        });
    });

    describe('socket', () => {
        const signal = { data: JSON.stringify({ type: 'sighting' }) };

        it('今日のときだけ socket の合図で refetchSightings を呼ぶ', () => {
            const today = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            today.socket$.next(signal);
            expect(today.service.refetchSightings).toHaveBeenCalledTimes(1);
            TestBed.resetTestingModule();
            const past = setup({
                params: { formation_number: '8713', date: '2026-11-01' },
            });
            past.socket$.next(signal);
            expect(past.service.refetchSightings).not.toHaveBeenCalled();
        });

        it('合図でない値では取り直さない', () => {
            const { socket$, service } = setup({
                params: { formation_number: '8713', date: '2026-11-11' },
            });
            socket$.next({ data: 'not json' });
            expect(service.refetchSightings).not.toHaveBeenCalled();
        });
    });
});
