import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotFoundContentComponent } from 'src/app/shared/not-found-content/not-found-content.component';

/** どのページにも当たらない URL。サーバーは状態コード 404 で返す（app.routes.server.ts） */
@Component({
    selector: 'app-not-found',
    template: `
        <main
            class="tw-flex tw-flex-col tw-gap-4 tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16"
        >
            <app-not-found-content></app-not-found-content>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NotFoundContentComponent],
})
export class NotFoundComponent {}
