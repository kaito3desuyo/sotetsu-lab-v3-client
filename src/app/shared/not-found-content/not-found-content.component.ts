import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

/** 見つからないときの表示。main は持たず、置く側のレイアウトに入る */
@Component({
    selector: 'app-not-found-content',
    template: `
        <app-empty-state
            icon="search_off"
            message="ページが見つかりません"
            subtitle="URL が変わったか、ページが無くなった可能性があります。"
            actionLabel="トップへ戻る"
            (actionClick)="onBackToTop()"
        ></app-empty-state>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent],
})
export class NotFoundContentComponent {
    readonly #router = inject(Router);
    readonly #notification = inject(NotificationService);

    onBackToTop(): void {
        notifyNavigationFailure(
            this.#router.navigate(['/']),
            this.#notification,
        );
    }
}
