import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_LOCATION } from 'src/app/core/services/app-update.service';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

/**
 * 最初の読み込みに失敗したときの画面（core/errors/initial-load-error.ts・route は app.route.ts）。
 * アドレス欄は開いた URL のままなので、読み込み直せば同じページを開き直せる。
 */
@Component({
    selector: 'app-load-error',
    template: `
        <main class="tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16">
            <article class="tw-overflow-clip tw-rounded-card tw-bg-white">
                <app-empty-state
                    icon="cloud_off"
                    headingLevel="h2"
                    message="読み込めませんでした"
                    subtitle="時間をおいてお試しください。"
                    actionLabel="もう一度読み込む"
                    (actionClick)="onReload()"
                ></app-empty-state>
            </article>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent],
})
export class LoadErrorComponent {
    readonly #location = inject(APP_LOCATION);

    onReload(): void {
        this.#location.reload();
    }
}
