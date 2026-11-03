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
import { InvalidateManyOperationSightingsResultDto } from 'src/app/libs/operation-sighting/usecase/dtos/invalidate-many-operation-sightings-result.dto';
import { OperationSightingSummaryDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-summary.dto';
import { UserAccessTraceDto } from 'src/app/libs/user/usecase/dtos/user-access-trace.dto';
import { UserSummaryDto } from 'src/app/libs/user/usecase/dtos/user-summary.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { ModerationUserComponent } from './moderation-user.component';
import { ModerationUserService } from './services/moderation-user.service';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const GHOST = '99999999-9999-4999-8999-999999999999';

function summary(overrides: Partial<UserSummaryDto> = {}): UserSummaryDto {
    return {
        userId: U1,
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
    overrides: Partial<OperationSightingSummaryDto> = {},
): OperationSightingSummaryDto {
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
    overrides: Partial<UserAccessTraceDto> = {},
): UserAccessTraceDto {
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
    summary?: UserSummaryDto;
    sightings?: OperationSightingSummaryDto[];
    traces?: UserAccessTraceDto[];
    dialogResult?: { reason: string } | undefined;
};

describe('ModerationUserComponent', () => {
    let fixture: ComponentFixture<ModerationUserComponent>;
    let params: BehaviorSubject<ParamMap>;
    let userApi: {
        findSummary: jest.Mock;
        findAccessTraces: jest.Mock;
        ban: jest.Mock;
        unban: jest.Mock;
    };
    let sightingApi: {
        findManyByUserId: jest.Mock;
        invalidateMany: jest.Mock;
    };
    let notificationOpen: jest.Mock;
    let dialogOpen: jest.Mock;

    async function render(options: Options = {}) {
        params = new BehaviorSubject(convertToParamMap({ userId: U1 }));
        userApi = {
            findSummary: jest
                .fn()
                .mockReturnValue(of(options.summary ?? summary())),
            findAccessTraces: jest
                .fn()
                .mockReturnValue(of(options.traces ?? [])),
            ban: jest.fn(),
            unban: jest.fn(),
        };
        sightingApi = {
            findManyByUserId: jest
                .fn()
                .mockReturnValue(of(options.sightings ?? [sighting('s1')])),
            invalidateMany: jest.fn(),
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
                { provide: UserService, useValue: userApi },
                {
                    provide: OperationSightingService,
                    useValue: sightingApi,
                },
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

        expect(userApi.findSummary).toHaveBeenCalledWith(U1);
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
        expect(userApi.findAccessTraces).not.toHaveBeenCalled();
    });

    it('MANAGER には BAN と手がかりが出て、手がかりを取りに行く', async () => {
        await render({ role: 'manager', traces: [trace()] });

        expect(userApi.findAccessTraces).toHaveBeenCalledWith(U1);
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
        await render({ role: 'manager', me: U1 });

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
        userApi.ban.mockReturnValue(
            of(summary({ banned: true, role: 'viewer' })),
        );

        await click(byId('ban-button'));

        expect(dialogOpen).toHaveBeenCalled();
        const data = dialogOpen.mock.calls[0][1].data;
        expect(data.lines.join('')).toContain('tetsu_x');
        expect(data.reasonRequired).toBe(true);
        expect(userApi.ban).toHaveBeenCalledWith(U1, '荒らし');
        expect(byId('moderation-user-summary')).toHaveTextContent('BAN 中');
        expect(byId('ban-button')).toHaveTextContent('BAN を解く');
    });

    it('確認でやめたら BAN しない', async () => {
        await render({ role: 'manager', dialogResult: undefined });

        await click(byId('ban-button'));

        expect(userApi.ban).not.toHaveBeenCalled();
    });

    it('BAN が 422 で断られたら、api の言葉を通知する', async () => {
        await render({ role: 'manager' });
        userApi.ban.mockReturnValue(
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
        userApi.unban.mockReturnValue(of(summary({ banned: false })));

        await click(byId('ban-button'));

        expect(dialogOpen.mock.calls[0][1].data.reasonRequired).toBe(false);
        expect(userApi.unban).toHaveBeenCalledWith(U1, undefined);
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

        expect(sightingApi.findManyByUserId).toHaveBeenCalledWith(U1, {
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
        const result: InvalidateManyOperationSightingsResultDto = {
            invalidated: ['s1', 's2'],
            skipped: [{ id: 's3', reason: 'already_invalidated' }],
            failed: { id: 's4', message: '保存に失敗しました' },
            pending: ['s5', 's6', 's7'],
        };
        sightingApi.invalidateMany.mockReturnValue(of(result));
        await click(checkbox('select-all-valid'));

        await click(byId('bulk-invalidate-button'));

        const data = dialogOpen.mock.calls[0][1].data;
        expect(data.lines.join('')).toContain('tetsu_x');
        expect(data.lines.join('')).toContain('4 件');
        expect(sightingApi.invalidateMany).toHaveBeenCalledWith({
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
        expect(userApi.findSummary).toHaveBeenCalledTimes(2);
        expect(sightingApi.findManyByUserId).toHaveBeenCalledTimes(2);
    });

    it('全部通ったときは件数だけを通知する', async () => {
        await render({ sightings: [sighting('s1')] });
        sightingApi.invalidateMany.mockReturnValue(
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

        expect(sightingApi.invalidateMany).not.toHaveBeenCalled();
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
        sightingApi.findManyByUserId.mockReturnValue(
            of([sighting('older', { createdAt: '2026-11-01T00:00:00.000Z' })]),
        );

        const more = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('もっと見る'),
        );
        await click(more);

        expect(sightingApi.findManyByUserId).toHaveBeenLastCalledWith(U1, {
            limit: 100,
            before: page[99].createdAt,
        });
        expect(el()).not.toHaveTextContent('もっと見る');
    });

    it('投稿者が見つからなければ（404）その旨を出す', async () => {
        await render();
        // 描き直し: 見つからない人へ
        userApi.findSummary.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        params.next(convertToParamMap({ userId: GHOST }));
        await settle();

        expect(el()).toHaveTextContent('投稿者が見つかりません');
        expect(byId('moderation-user-summary')).toBeNull();
    });

    it('初回の取得に失敗したら再読み込みを出し、押すと取り直す', async () => {
        await render();
        userApi.findSummary.mockReturnValue(
            throwError(() => new Error('offline')),
        );
        params.next(convertToParamMap({ userId: U2 }));
        await settle();
        expect(el()).toHaveTextContent('読み込めませんでした');

        userApi.findSummary.mockReturnValue(
            of(summary({ userId: U2, username: 'second' })),
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

        userApi.findSummary.mockReturnValue(NEVER);
        sightingApi.findManyByUserId.mockReturnValue(NEVER);
        userApi.findAccessTraces.mockReturnValue(NEVER);
        params.next(convertToParamMap({ userId: U2 }));
        await settle();

        expect(userApi.findSummary).toHaveBeenLastCalledWith(U2);
        expect(el()).not.toHaveTextContent('tetsu_x');
        expect(el()).not.toHaveTextContent('203.0.113.24');
        expect(el().querySelectorAll('tbody tr')).toHaveLength(0);
    });

    it('無効化の応答を待つあいだに別の人へ移っても、応答後に前の人の要約・目撃で上書きしない', async () => {
        await render({ sightings: [sighting('s1')] });
        const response =
            new Subject<InvalidateManyOperationSightingsResultDto>();
        sightingApi.invalidateMany.mockReturnValue(response);
        await click(checkbox('select-all-valid'));
        await click(byId('bulk-invalidate-button'));

        userApi.findSummary.mockReturnValue(
            of(summary({ userId: U2, username: 'second' })),
        );
        sightingApi.findManyByUserId.mockReturnValue(
            of([sighting('t1', { operationNumber: '77Z' })]),
        );
        params.next(convertToParamMap({ userId: U2 }));
        await settle();
        const getUserCalls = userApi.findSummary.mock.calls.length;
        notificationOpen.mockClear();

        response.next({
            invalidated: ['s1'],
            skipped: [],
            failed: null,
            pending: [],
        });
        response.complete();
        await settle();

        expect(userApi.findSummary).toHaveBeenCalledTimes(getUserCalls);
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
        const next = new Subject<OperationSightingSummaryDto[]>();
        sightingApi.findManyByUserId.mockReturnValue(next);
        const more = Array.from(el().querySelectorAll('button')).find((b) =>
            b.textContent?.includes('もっと見る'),
        );
        await click(more);

        sightingApi.findManyByUserId.mockReturnValue(of([sighting('t1')]));
        userApi.findSummary.mockReturnValue(
            of(summary({ userId: U2, username: 'second' })),
        );
        params.next(convertToParamMap({ userId: U2 }));
        await settle();
        notificationOpen.mockClear();
        next.error(new Error('offline'));
        await settle();

        expect(notificationOpen).not.toHaveBeenCalled();
        expect(byId('moderation-user-summary')).toHaveTextContent('second');
    });

    it('投稿者が 404 のときは、manager でも手がかりの失敗を通知しない', async () => {
        await render();
        userApi.findSummary.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        userApi.findAccessTraces.mockReturnValue(
            throwError(() => new FetchError(404, 'Not Found')),
        );
        patchState(unprotected(TestBed.inject(UserState)), { role: 'manager' });
        notificationOpen.mockClear();

        params.next(convertToParamMap({ userId: GHOST }));
        await settle();

        expect(el()).toHaveTextContent('投稿者が見つかりません');
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('userId が UUID の形でなければ、見つからない扱いにして何も取りに行かない', async () => {
        await render({ role: 'manager' });
        userApi.findSummary.mockClear();
        sightingApi.findManyByUserId.mockClear();
        userApi.findAccessTraces.mockClear();

        params.next(convertToParamMap({ userId: '../admin' }));
        await settle();

        expect(el()).toHaveTextContent('投稿者が見つかりません');
        expect(byId('moderation-user-summary')).toBeNull();
        expect(userApi.findSummary).not.toHaveBeenCalled();
        expect(sightingApi.findManyByUserId).not.toHaveBeenCalled();
        expect(userApi.findAccessTraces).not.toHaveBeenCalled();
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
