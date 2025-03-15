import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationTableHeaderCComponent } from './components/operation-table-header-c/operation-table-header-c.component';
import { OperationTableMainCComponent } from './components/operation-table-main-c/operation-table-main-c.component';

@Component({
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationTableHeaderCComponent, OperationTableMainCComponent]
})
export class OperationTableComponent {
    readonly #router = inject(Router);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    constructor() {
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
