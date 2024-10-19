import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationTableHeaderCComponent } from './components/operation-table-header-c/operation-table-header-c.component';
import { OperationTableMainCComponent } from './components/operation-table-main-c/operation-table-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationTableHeaderCComponent, OperationTableMainCComponent],
})
export class OperationTableComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #titleService = inject(TitleService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    readonly #data = toSignal(this.#route.data);

    constructor() {
        effect(() => {
            const { title } = this.#data();
            untracked(() => {
                this.#titleService.setTitle(title);
            });
        });

        this.#operationSearchCardService
            .receiveSearchOperationTableEvent()
            .pipe(takeUntilDestroyed())
            .subscribe((calendarId) => {
                this.#router.navigate([
                    '/operation/table',
                    { calendar_id: calendarId },
                ]);
            });

        this.#operationSearchCardService
            .receiveSearchOperationRouteDiagramEvent()
            .pipe(takeUntilDestroyed())
            .subscribe((operationId) => {
                this.#router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
                ]);
            });
    }
}
