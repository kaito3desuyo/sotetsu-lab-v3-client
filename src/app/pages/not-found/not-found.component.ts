import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

/** どのページにも当たらない URL。サーバーは状態コード 404 で返す（app.routes.server.ts） */
@Component({
    selector: 'app-not-found',
    template: `
        <main class="tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16">
            <app-empty-state
                icon="search_off"
                message="ページが見つかりません"
                subtitle="URL が変わったか、ページが無くなった可能性があります。"
                actionLabel="トップへ戻る"
                (actionClick)="onBackToTop()"
            ></app-empty-state>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent],
})
export class NotFoundComponent {
    readonly #router = inject(Router);
    readonly #notification = inject(NotificationService);

    onBackToTop(): void {
        notifyNavigationFailure(
            this.#router.navigate(['/']),
            this.#notification,
        );
    }
}
