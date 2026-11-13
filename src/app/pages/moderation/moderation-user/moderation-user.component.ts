import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, firstValueFrom, lastValueFrom, map } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { NotificationService } from 'src/app/core/services/notification.service';
import { UserState } from 'src/app/global-states/user.state';
import { OperationSightingSummaryDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-summary.dto';
import { UserAccessTraceDto } from 'src/app/libs/user/usecase/dtos/user-access-trace.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import {
    formatTokyoDateTime,
    formatTokyoDateTimeWithYear,
} from '../utils/format-tokyo-date-time.util';
import { ModerationConfirmDialogComponent } from './components/moderation-confirm-dialog/moderation-confirm-dialog.component';
import {
    ModerationConfirmDialogData,
    ModerationConfirmDialogResult,
} from './components/moderation-confirm-dialog/moderation-confirm-dialog.type';
import { ModerationUserService } from './services/moderation-user.service';
import {
    MODERATION_INVALIDATE_MAX_IDS,
    ModerationUserStore,
} from './stores/moderation-user.store';
import { buildInvalidateResultMessage } from './utils/invalidate-result-message.util';
import { FormationNumberLinkComponent } from 'src/app/shared/formation-number-link/formation-number-link.component';

const ROLE_LABELS: Record<string, string> = {
    viewer: '閲覧者',
    reporter: '投稿者',
    editor: '編集者',
    manager: '管理者',
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
    selector: 'app-moderation-user',
    templateUrl: './moderation-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormationNumberLinkComponent,
        RouterLink,
        MatButtonModule,
        MatCheckboxModule,
        MatTableModule,
        AppButtonComponent,
        EmptyStateComponent,
        SkeletonBarComponent,
    ],
})
export class ModerationUserComponent {
    readonly #store = inject(ModerationUserStore);
    readonly #service = inject(ModerationUserService);
    readonly #notification = inject(NotificationService);
    readonly #userState = inject(UserState);
    readonly #dialog = inject(MatDialog);
    readonly #route = inject(ActivatedRoute);

    readonly summary = this.#store.summary;
    readonly sightings = this.#store.sightings;
    readonly traces = this.#store.traces;
    readonly tracesFailed = this.#store.tracesFailed;
    readonly hasMore = this.#store.hasMore;
    readonly hasFetched = this.#store.hasFetched;
    readonly firstFetchFailed = this.#store.firstFetchFailed;
    readonly notFound = this.#store.notFound;
    readonly isLoading = this.#store.isLoading;
    readonly selectedCount = this.#store.selectedCount;
    readonly overSelectionLimit = this.#store.overSelectionLimit;
    readonly allValidSelected = this.#store.allValidSelected;
    readonly isManager = this.#userState.isManager;

    readonly maxIds = MODERATION_INVALIDATE_MAX_IDS;
    readonly selectedSet = computed(() => new Set(this.#store.selectedIds()));
    /** BAN のボタンは manager が、自分でも manager でもない人のページを見ているときだけ */
    readonly canBan = computed(() => {
        const summary = this.#store.summary();
        return (
            this.#userState.isManager() &&
            !!summary &&
            summary.userId !== this.#userState.userId() &&
            summary.role !== 'manager'
        );
    });

    readonly sightingColumns = [
        'select',
        'createdAt',
        'operationNumber',
        'formationNumber',
        'status',
    ];
    readonly traceColumns = [
        'ip',
        'userAgents',
        'count',
        'lastSeenAt',
        'otherAccounts',
    ];
    readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);

    readonly formatTime = formatTokyoDateTime;
    readonly formatTimeWithYear = formatTokyoDateTimeWithYear;
    readonly roleLabel = (role: string): string => ROLE_LABELS[role] ?? role;
    readonly trackBySighting = (
        _: number,
        row: OperationSightingSummaryDto,
    ): string => row.operationSightingId;
    readonly trackByTrace = (_: number, row: UserAccessTraceDto): string =>
        row.ip;

    constructor() {
        this.#route.paramMap
            .pipe(
                map((params) => params.get('userId')),
                distinctUntilChanged(),
                takeUntilDestroyed(),
            )
            .subscribe((userId) => {
                if (userId) {
                    this.#store.beginUser(userId);
                    // UUID でない値は api の URL に載せず、見つからない扱いにする
                    if (UUID_PATTERN.test(userId)) {
                        this.reload();
                    } else {
                        this.#store.setNotFound(true);
                    }
                }
            });
    }

    /** 要約・目撃の先頭・（manager なら）手がかりを取り直す。初回と、失敗したあとの再読み込み */
    reload(): void {
        const userId = this.#store.userId();
        if (!userId || !UUID_PATTERN.test(userId)) {
            return;
        }
        this.#store.setFirstFetchFailed(false);
        this.#store.setNotFound(false);
        const userLoaded = this.#loadUser(userId);
        if (this.#userState.isManager()) {
            void this.#loadTraces(userId, userLoaded);
        }
    }

    reloadTraces(): void {
        const userId = this.#store.userId();
        if (userId) {
            void this.#loadTraces(userId);
        }
    }

    loadMore(): void {
        const userId = this.#store.userId();
        if (!userId) {
            return;
        }
        void this.#run(
            this.#service.fetchNextSightings(userId),
            '目撃の一覧を取得できませんでした',
            userId,
        );
    }

    toggleRow(id: string, selected: boolean): void {
        this.#store.toggleSelected(id, selected);
    }

    toggleAllValid(selected: boolean): void {
        if (selected) {
            this.#store.selectAllValid();
        } else {
            this.#store.clearSelection();
        }
    }

    async invalidateSelected(): Promise<void> {
        const userId = this.#store.userId();
        const summary = this.#store.summary();
        const ids = this.#store.selectedIds();
        if (
            !userId ||
            !summary ||
            ids.length === 0 ||
            ids.length > MODERATION_INVALIDATE_MAX_IDS
        ) {
            return;
        }
        const confirmed = await this.#confirm({
            title: 'まとめて無効にする',
            lines: [
                `${summary.username} の目撃 ${ids.length} 件を無効にします。`,
                '選んだ目撃は、一覧で「無効」になります。',
            ],
            reasonRequired: true,
            confirmLabel: '無効にする',
        });
        if (!confirmed || this.#store.userId() !== userId) {
            return;
        }

        this.#store.enableLoading();
        try {
            const result = await lastValueFrom(
                this.#service.invalidateSightings(ids, confirmed.reason),
            );
            // 応答を待つあいだに別の人のページへ移っていたら、通知も取り直しもしない
            if (this.#store.userId() !== userId) {
                return;
            }
            const failed = result.failed
                ? this.#store
                      .sightings()
                      .find((r) => r.operationSightingId === result.failed.id)
                : undefined;
            this.#notification.open(
                buildInvalidateResultMessage(result, failed?.operationNumber),
                'OK',
            );
        } catch (error) {
            if (this.#store.userId() === userId) {
                this.#notification.open(
                    errorMessage(error, '無効にできませんでした'),
                    'OK',
                );
            }
            return;
        } finally {
            this.#store.disableLoading();
        }

        // 一覧と要約を取り直す（無効にした行・件数が変わる）
        await this.#run(
            this.#service.fetchUser(userId),
            '一覧を取り直せませんでした',
            userId,
        );
    }

    async toggleBan(): Promise<void> {
        const summary = this.#store.summary();
        if (!summary || !this.canBan()) {
            return;
        }
        const banning = !summary.banned;
        const confirmed = await this.#confirm(
            banning
                ? {
                      title: 'BAN する',
                      lines: [
                          `${summary.username} を BAN します。`,
                          '役割は viewer に下がり、投稿できなくなります。解くときは元の役割に戻ります。',
                      ],
                      reasonRequired: true,
                      confirmLabel: 'BAN する',
                  }
                : {
                      title: 'BAN を解く',
                      lines: [
                          `${summary.username} の BAN を解きます。`,
                          '元の役割に戻ります。',
                      ],
                      reasonRequired: false,
                      confirmLabel: '解く',
                  },
        );
        if (!confirmed || this.#store.userId() !== summary.userId) {
            return;
        }

        this.#store.enableLoading();
        try {
            await lastValueFrom(
                banning
                    ? this.#service.ban(summary.userId, confirmed.reason)
                    : this.#service.unban(
                          summary.userId,
                          confirmed.reason === ''
                              ? undefined
                              : confirmed.reason,
                      ),
            );
            if (this.#store.userId() === summary.userId) {
                this.#notification.open(
                    banning ? 'BAN しました' : 'BAN を解きました',
                    'OK',
                );
            }
        } catch (error) {
            if (this.#store.userId() === summary.userId) {
                this.#notification.open(
                    errorMessage(
                        error,
                        banning
                            ? 'BAN できませんでした'
                            : 'BAN を解けませんでした',
                    ),
                    'OK',
                );
            }
        } finally {
            this.#store.disableLoading();
        }
    }

    #confirm(
        data: ModerationConfirmDialogData,
    ): Promise<ModerationConfirmDialogResult | undefined> {
        return firstValueFrom(
            this.#dialog
                .open<
                    ModerationConfirmDialogComponent,
                    ModerationConfirmDialogData,
                    ModerationConfirmDialogResult | undefined
                >(ModerationConfirmDialogComponent, {
                    width: '360px',
                    autoFocus: false,
                    disableClose: true,
                    data,
                })
                .afterClosed(),
            { defaultValue: undefined },
        );
    }

    async #loadUser(userId: string): Promise<void> {
        this.#store.enableLoading();
        try {
            await lastValueFrom(this.#service.fetchUser(userId));
        } catch (error) {
            // 取っているあいだに別の人のページへ移っていたら、前の人の失敗は出さない
            if (this.#store.userId() !== userId) {
                return;
            }
            if (error instanceof FetchError && error.statusCode === 404) {
                this.#store.setNotFound(true);
            } else {
                if (!this.#store.hasFetched()) {
                    this.#store.setFirstFetchFailed(true);
                }
                this.#notification.open('投稿者を取得できませんでした', 'OK');
            }
        } finally {
            this.#store.disableLoading();
        }
    }

    /** @param userLoaded 要約の取得の終わり。投稿者が無い（404）なら手がかりの失敗は出さない */
    async #loadTraces(
        userId: string,
        userLoaded?: Promise<void>,
    ): Promise<void> {
        this.#store.setTracesFailed(false);
        try {
            await lastValueFrom(this.#service.fetchTraces(userId));
        } catch {
            await userLoaded;
            if (this.#store.userId() === userId && !this.#store.notFound()) {
                this.#store.setTracesFailed(true);
                this.#notification.open('手がかりを取得できませんでした', 'OK');
            }
        }
    }

    async #run(
        fetch$: ReturnType<ModerationUserService['fetchUser']>,
        failureMessage: string,
        userId: string,
    ): Promise<void> {
        this.#store.enableLoading();
        try {
            await lastValueFrom(fetch$);
        } catch {
            // 取っているあいだに別の人のページへ移っていたら、前の人の失敗は出さない
            if (this.#store.userId() === userId) {
                this.#notification.open(failureMessage, 'OK');
            }
        } finally {
            this.#store.disableLoading();
        }
    }
}

/** api が断った理由（422 の UseCaseError など）はその言葉を通知する。通信の失敗などは既定の文 */
function errorMessage(error: unknown, fallback: string): string {
    return error instanceof FetchError &&
        error.statusCode >= 400 &&
        error.statusCode < 500 &&
        error.message
        ? error.message
        : fallback;
}
