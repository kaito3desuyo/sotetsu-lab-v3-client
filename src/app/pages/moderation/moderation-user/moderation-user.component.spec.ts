import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import {
    ActivatedRoute,
    convertToParamMap,
    ParamMap,
    provideRouter,
} from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { BehaviorSubject, NEVER, of, Subject, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { NotificationService } from 'src/app/core/services/notification.service';
import { UserState } from 'src/app/global-states/user.state';
import { ModerationBulkInvalidateResultDto } from 'src/app/libs/moderation/usecase/dtos/moderation-bulk-invalidate-result.dto';
import { ModerationSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-sighting.dto';
import { ModerationTraceDto } from 'src/app/libs/moderation/usecase/dtos/moderation-trace.dto';
import { ModerationUserSummaryDto } from 'src/app/libs/moderation/usecase/dtos/moderation-user-summary.dto';
import { ModerationService } from 'src/app/libs/moderation/usecase/moderation.service';
import { ModerationUserComponent } from './moderation-user.component';
import { ModerationUserService } from './services/moderation-user.service';

function summary(
    overrides: Partial<ModerationUserSummaryDto> = {},
): ModerationUserSummaryDto {
    return {
        userId: 'u1',
        username: 'tetsu_x',
        displayName: 'てつ',
        role: 'reporter',
        createdAt: '2026-11-07T02:02:00.000Z',
        sightingCount: 14,
        invalidatedCount: 3,
        firstSightingAt: '2026-11-07T02:15:00.000Z',
        lastSightingAt: '2026-11-07T04:05:00.000Z',
        banned: false,
        ...overrides,
    };
}

function sighting(
    id: string,
    overrides: Partial<ModerationSightingDto> = {},
): ModerationSightingDto {
    return {
        operationSightingId: id,
        sightingTime: '2026-11-02T10:00:00.000Z',
        createdAt: '2026-11-02T10:00:05.000Z',
        operationNumber: '10A',
        formationNumber: '12101',
        invalidated: false,
        invalidatedBy: null,
        ...overrides,
    };
}

function trace(
    overrides: Partial<ModerationTraceDto> = {},
): ModerationTraceDto {
    return {
        ip: '203.0.113.24',
        userAgents: ['iPhone / Safari'],
        count: 12,
        lastSeenAt: '2026-11-07T04:05:00.000Z',
        accountCount: 1,
        shared: false,
        otherAccounts: [],
        ...overrides,
    };
}

type Options = {
    role?: 'editor' | 'manager';
    me?: string;
    summary?: ModerationUserSummaryDto;
    sightings?: ModerationSightingDto[];
    traces?: ModerationTraceDto[];
    dialogResult?: { reason: string } | undefined;
};

describe('ModerationUserComponent', () => {
    let fixture: ComponentFixture<ModerationUserComponent>;
    let params: BehaviorSubject<ParamMap>;
    let moderation: {
        getUser: jest.Mock;
        getUserSightings: jest.Mock;
        getUserTraces: jest.Mock;
        invalidateSightings: jest.Mock;
        ban: jest.Mock;
        unban: jest.Mock;
    };
    let notificationOpen: jest.Mock;
    let dialogOpen: jest.Mock;

    async function render(options: Options = {}) {
        params = new BehaviorSubject(convertToParamMap({ userId: 'u1' }));
        moderation = {
            getUser: jest
                .fn()
                .mockReturnValue(of(options.summary ?? summary())),
            getUserSightings: jest
                .fn()
                .mockReturnValue(of(options.sightings ?? [sighting('s1')])),
            getUserTraces: jest.fn().mockReturnValue(of(options.traces ?? [])),
            invalidateSightings: jest.fn(),
            ban: jest.fn(),
            unban: jest.fn(),
        };
        notificationOpen = jest.fn();
        dialogOpen = jest.fn().mockReturnValue({
            afterClosed: () =>
                of(
                    'dialogResult' in options
                        ? options.dialogResult
                        : { reason: '荒らし' },
                ),
        });
        await TestBed.configureTestingModule({
            imports: [ModerationUserComponent],
            providers: [
                provideRouter([]),
                ModerationUserService,
                { provide: ActivatedRoute, useValue: { paramMap: params } },
                { provide: ModerationService, useValue: moderation },
                {
                    provide: NotificationService,
                    useValue: { open: notificationOpen },
                },
                { provide: MatDialog, useValue: { open: dialogOpen } },
            ],
        }).compileComponents();
        patchState(unprotected(TestBed.inject(UserState)), {
            userId: options.me ?? 'me',
            role: options.role ?? 'editor',
        });
        fixture = TestBed.createComponent(ModerationUserComponent);
        await settle();
    }

    async function settle() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function el(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    function byId(id: string): HTMLElement | null {
        return el().querySelector(`[data-testid="${id}"]`);
    }

    function checkbox(id: string): HTMLInputElement {
        return byId(id).querySelector('input');
    }

    async function click(target: HTMLElement) {
        target.click();
        await settle();
    }

    it('投稿者の要約を出す', async () => {
        await render();

        expect(moderation.getUser).toHaveBeenCalledWith('u1');
        const text = byId('moderation-user-summary').textContent;
        expect(text).toContain('tetsu_x');
        expect(text).toContain('てつ');
        expect(text).toContain('reporter');
        expect(text).toContain('14');
        expect(text).toContain('3');
    });

    it('EDITOR には BAN と手がかりの段が無く、手がかりも取りに行かない', async () => {
        await render({ role: 'editor' });

        expect(byId('moderation-ban-section')).toBeNull();
        expect(byId('moderation-traces-section')).toBeNull();
        expect(byId('ban-button')).toBeNull();
        expect(moderation.getUserTraces).not.toHaveBeenCalled();
    });

    it('MANAGER には BAN と手がかりが出て、手がかりを取りに行く', async () => {
        await render({ role: 'manager', traces: [trace()] });

        expect(moderation.getUserTraces).toHaveBeenCalledWith('u1');
        expect(byId('moderation-ban-section')).not.toBeNull();
        expect(byId('ban-button')).toHaveTextContent('BAN');
        expect(byId('moderation-traces-section')).toHaveTextContent(
            '203.0.113.24',
        );
        expect(byId('moderation-traces-section')).toHaveTextContent(
            'iPhone / Safari',
        );
    });

    it('自分のページには BAN のボタンが無い（手がかりは出る）', async () => {
        await render({ role: 'manager', me: 'u1' });

        expect(byId('ban-button')).toBeNull();
        expect(byId('moderation-traces-section')).not.toBeNull();
    });

    it('manager のページにも BAN のボタンが無い', async () => {
        await render({
            role: 'manager',
            summary: summary({ role: 'manager' }),
        });

        expect(byId('ban-button')).toBeNull();
    });

    it('手がかりの他のアカウントは投稿者のページへのリンクで、BAN 済みは赤い印', async () => {
        await render({
            role: 'manager',
            traces: [
                trace({
                    accountCount: 3,
                    otherAccounts: [
                        {
                            userId: 'u8',
                            username: 'tetsu_y',
                            role: 'viewer',
                            banned: true,
                        },
                        {
                            userId: 'u9',
                            username: 'tetsu_z',
                            role: 'reporter',
                            banned: false,
                        },
                    ],
                }),
            ],
        });

        const section = byId('moderation-traces-section');
        const banned = section.querySelector('a[href="/moderation/users/u8"]');
        const normal = section.querySelector('a[href="/moderation/users/u9"]');
        expect(banned).toHaveTextContent('tetsu_y');
        expect(banned.parentElement).toHaveTextContent('BAN 中');
        expect(normal.parentElement).not.toHaveTextContent('BAN 中');
    });

    it('shared の行は弱めて「共用」と添える', async () => {
        await render({
            role: 'manager',
            traces: [trace({ shared: true }), trace({ ip: '198.51.100.7' })],
        });

        const rows = byId('moderation-traces-section').querySelectorAll(
            'tbody tr',
        );
        expect(rows[0]).toHaveClass('tw-opacity-50');
        expect(rows[0]).toHaveTextContent('共用');
        expect(rows[1]).not.toHaveClass('tw-opacity-50');
        expect(rows[1]).not.toHaveTextContent('共用');
    });

    it('BAN 済みの人には「BAN 中」と出し、ボタンは「BAN を解く」', async () => {
        await render({
            role: 'manager',
            summary: summary({ banned: true, role: 'viewer' }),
        });

        expect(byId('moderation-user-summary')).toHaveTextContent('BAN 中');
        expect(byId('ban-button')).toHaveTextContent('BAN を解く');
    });

    it('BAN は確認で理由を聞き、返った要約に差し替える', async () => {
        await render({ role: 'manager' });
        moderation.ban.mockReturnValue(
            of(summary({ banned: true, role: 'viewer' })),
        );

        await click(byId('ban-button'));

        expect(dialogOpen).toHaveBeenCalled();
        const data = dialogOpen.mock.calls[0][1].data;
        expect(data.lines.join('')).toContain('tetsu_x');
        expect(data.reasonRequired).toBe(true);
        expect(moderation.ban).toHaveBeenCalledWith('u1', '荒らし');
        expect(byId('moderation-user-summary')).toHaveTextContent('BAN 中');
        expect(byId('ban-button')).toHaveTextContent('BAN を解く');
    });

    it('確認でやめたら BAN しない', async () => {
        await render({ role: 'manager', dialogResult: undefined });

        await click(byId('ban-button'));

        expect(moderation.ban).not.toHaveBeenCalled();
    });

    it('BAN が 422 で断られたら、api の言葉を通知する', async () => {
        await render({ role: 'manager' });
        moderation.ban.mockReturnValue(
            throwError(() => new FetchError(422, 'すでに BAN されています')),
        );

        await click(byId('ban-button'));

        expect(notificationOpen).toHaveBeenCalledWith(
            'すでに BAN されています',
            'OK',
        );
        expect(byId('moderation-user-summary')).not.toHaveTextContent('BAN 中');
    });

    it('BAN の解除は理由が任意で、空なら理由なしで送る', async () => {
        await render({
            role: 'manager',
            summary: summary({ banned: true, role: 'viewer' }),
            dialogResult: { reason: '' },
        });
        moderation.unban.mockReturnValue(of(summary({ banned: false })));

        await click(byId('ban-button'));

        expect(dialogOpen.mock.calls[0][1].data.reasonRequired).toBe(false);
        expect(moderation.unban).toHaveBeenCalledWith('u1', undefined);
        expect(byId('moderation-user-summary')).not.toHaveTextContent('BAN 中');
        expect(byId('ban-button')).toHaveTextContent('BAN');
        expect(byId('ban-button')).not.toHaveTextContent('BAN を解く');
    });

    it('目撃を取り、まだ有効なものを全部選ぶと件数がボタンに出る（無効の行は選ばれない）', async () => {
        await render({
            sightings: [
                sighting('s1'),
                sighting('s2'),
                sighting('s3', {
                    invalidated: true,
                    invalidatedBy: { userId: 'e1', username: 'editorA' },
                }),
            ],
        });

        expect(moderation.getUserSightings).toHaveBeenCalledWith('u1', {
            limit: 100,
        });
        expect(byId('bulk-invalidate-button')).toBeDisabled();
        expect(byId('bulk-invalidate-button')).toHaveTextContent(
            '選んだ 0 件を無効にする',
        );
        expect(checkbox('select-row-s3').disabled).toBe(true);

        await click(checkbox('select-all-valid'));

        expect(byId('bulk-invalidate-button')).toBeEnabled();
        expect(byId('bulk-invalidate-button')).toHaveTextContent(
            '選んだ 2 件を無効にする',
        );
        expect(checkbox('select-row-s1').checked).toBe(true);
        expect(checkbox('select-row-s3').checked).toBe(false);
    });

    it('まとめての無効化は確認で件数と名前を示し、結果（無効・飛ばし・止まり・残り）を通知して取り直す', async () => {
        await render({
            sightings: [
                sighting('s1'),
                sighting('s2'),
                sighting('s3'),
                sighting('s4', { operationNumber: '26K' }),
            ],
        });
        const result: ModerationBulkInvalidateResultDto = {
            invalidated: ['s1', 's2'],
            skipped: [{ id: 's3', reason: 'already_invalidated' }],
            failed: { id: 's4', message: '保存に失敗しました' },
            pending: ['s5', 's6', 's7'],
        };
        moderation.invalidateSightings.mockReturnValue(of(result));
        await click(checkbox('select-all-valid'));

        await click(byId('bulk-invalidate-button'));

        const data = dialogOpen.mock.calls[0][1].data;
        expect(data.lines.join('')).toContain('tetsu_x');
        expect(data.lines.join('')).toContain('4 件');
        expect(moderation.invalidateSightings).toHaveBeenCalledWith({
            ids: ['s1', 's2', 's3', 's4'],
            reason: '荒らし',
        });
        const message = notificationOpen.mock.calls.at(-1)[0] as string;
        expect(message).toContain('2 件を無効にしました');
        expect(message).toContain(
            '1 件は飛ばしました（すでに無効・見つからない）',
        );
        expect(message).toContain('26K で止まりました: 保存に失敗しました');
        expect(message).toContain('残り 3 件は無効にできていません');
        expect(moderation.getUser).toHaveBeenCalledTimes(2);
        expect(moderation.getUserSightings).toHaveBeenCalledTimes(2);
    });

    it('全部通ったときは件数だけを通知する', async () => {
        await render({ sightings: [sighting('s1')] });
        moderation.invalidateSightings.mockReturnValue(
            of({ invalidated: ['s1'], skipped: [], failed: null, pending: [] }),
        );
        await click(checkbox('select-all-valid'));

        await click(byId('bulk-invalidate-button'));

        expect(notificationOpen).toHaveBeenLastCalledWith(
            '1 件を無効にしました',
            'OK',
        );
    });

    it('確認でやめたら無効にしない', async () => {
        await render({ dialogResult: undefined });
        await click(checkbox('select-all-valid'));

        await click(byId('bulk-invalidate-button'));

        expect(moderation.invalidateSightings).not.toHaveBeenCalled();
    });

    it('一度に 200 件を超えて選ぶとボタンを押せず、ヒントを出す', async () => {
        const rows = Array.from({ length: 201 }, (_, i) => sighting(`s${i}`));
        await render({ sightings: rows });

        await click(checkbox('select-all-valid'));

        expect(byId('bulk-invalidate-button')).toBeDisabled();
        expect(el()).toHaveTextContent('一度に 200 件まで');
    });

    it('投稿者の目撃が 0 件なら空の状態を出し、まとめての無効化は押せない', async () => {
        await render({
            sightings: [],
            summary: summary({ sightingCount: 0, invalidatedCount: 0 }),
        });

        expect(el()).toHaveTextContent('投稿はまだありません');
        expect(byId('bulk-invalidate-button')).toBeDisabled();
    });

    it('100 件に満ちていれば「もっと見る」で最後の createdAt より前を取り足す', async () => {
        const page = Array.from({ length: 100 }, (_, i) =>
            sighting(`s${i}`, {
                createdAt: `2026-11-02T10:00:00.${String(999 - i).padStart(3, '0')}Z`,
            }),
        );
        await render({ sightings: page });
        moderation.getUserSightings.mockReturnValue(
            of([sighting('older', { createdAt: '2026-11-01T00:00:00.000Z' })]),
        );

        const more = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('もっと見る'),
        );
        await click(more);

        expect(moderation.getUserSightings).toHaveBeenLastCalledWith('u1', {
            limit: 100,
            before: page[99].createdAt,
        });
        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('投稿者が見つからなければ（404）その旨を出す', async () => {
        await render();
        // 描き直し: 見つからない人へ
        moderation.getUser.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        params.next(convertToParamMap({ userId: 'ghost' }));
        await settle();

        expect(el()).toHaveTextContent('投稿者が見つかりません');
        expect(byId('moderation-user-summary')).toBeNull();
    });

    it('初回の取得に失敗したら再読み込みを出し、押すと取り直す', async () => {
        await render();
        moderation.getUser.mockReturnValue(
            throwError(() => new Error('offline')),
        );
        params.next(convertToParamMap({ userId: 'u2' }));
        await settle();
        expect(el()).toHaveTextContent('読み込めませんでした');

        moderation.getUser.mockReturnValue(
            of(summary({ userId: 'u2', username: 'second' })),
        );
        const retry = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('再読み込み'),
        );
        await click(retry);

        expect(el()).not.toHaveTextContent('読み込めませんでした');
        expect(byId('moderation-user-summary')).toHaveTextContent('second');
    });

    it('別の投稿者へ移っても、前の人の中身は出さない', async () => {
        await render({
            role: 'manager',
            traces: [trace({ ip: '203.0.113.24' })],
        });
        expect(byId('moderation-user-summary')).toHaveTextContent('tetsu_x');

        moderation.getUser.mockReturnValue(NEVER);
        moderation.getUserSightings.mockReturnValue(NEVER);
        moderation.getUserTraces.mockReturnValue(NEVER);
        params.next(convertToParamMap({ userId: 'u2' }));
        await settle();

        expect(moderation.getUser).toHaveBeenLastCalledWith('u2');
        expect(el()).not.toHaveTextContent('tetsu_x');
        expect(el()).not.toHaveTextContent('203.0.113.24');
        expect(el().querySelectorAll('tbody tr')).toHaveLength(0);
    });

    it('無効化の応答を待つあいだに別の人へ移っても、応答後に前の人の要約・目撃で上書きしない', async () => {
        await render({ sightings: [sighting('s1')] });
        const response = new Subject<ModerationBulkInvalidateResultDto>();
        moderation.invalidateSightings.mockReturnValue(response);
        await click(checkbox('select-all-valid'));
        await click(byId('bulk-invalidate-button'));

        moderation.getUser.mockReturnValue(
            of(summary({ userId: 'u2', username: 'second' })),
        );
        moderation.getUserSightings.mockReturnValue(
            of([sighting('t1', { operationNumber: '77Z' })]),
        );
        params.next(convertToParamMap({ userId: 'u2' }));
        await settle();
        const getUserCalls = moderation.getUser.mock.calls.length;
        notificationOpen.mockClear();

        response.next({
            invalidated: ['s1'],
            skipped: [],
            failed: null,
            pending: [],
        });
        response.complete();
        await settle();

        expect(moderation.getUser).toHaveBeenCalledTimes(getUserCalls);
        expect(byId('moderation-user-summary')).toHaveTextContent('second');
        expect(el()).toHaveTextContent('77Z');
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('取り足しの応答を待つあいだに別の人へ移ったら、失敗しても通知しない', async () => {
        const page = Array.from({ length: 100 }, (_, i) =>
            sighting(`s${i}`, {
                createdAt: `2026-11-02T10:00:00.${String(999 - i).padStart(3, '0')}Z`,
            }),
        );
        await render({ sightings: page });
        const next = new Subject<ModerationSightingDto[]>();
        moderation.getUserSightings.mockReturnValue(next);
        const more = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('もっと見る'),
        );
        await click(more);

        moderation.getUserSightings.mockReturnValue(of([sighting('t1')]));
        moderation.getUser.mockReturnValue(
            of(summary({ userId: 'u2', username: 'second' })),
        );
        params.next(convertToParamMap({ userId: 'u2' }));
        await settle();
        notificationOpen.mockClear();
        next.error(new Error('offline'));
        await settle();

        expect(notificationOpen).not.toHaveBeenCalled();
        expect(byId('moderation-user-summary')).toHaveTextContent('second');
    });

    it('投稿者が 404 のときは、manager でも手がかりの失敗を通知しない', async () => {
        await render();
        moderation.getUser.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        moderation.getUserTraces.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        patchState(unprotected(TestBed.inject(UserState)), { role: 'manager' });
        notificationOpen.mockClear();

        params.next(convertToParamMap({ userId: 'ghost' }));
        await settle();

        expect(el()).toHaveTextContent('投稿者が見つかりません');
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('登録の日時は年まで出す', async () => {
        await render({
            summary: summary({ createdAt: '2026-11-03T01:00:00.000Z' }),
        });

        expect(byId('moderation-user-summary')).toHaveTextContent(
            '登録 2026/11/03 10:00',
        );
    });
});
