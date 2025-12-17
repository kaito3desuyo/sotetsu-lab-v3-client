import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeHeaderComponent } from './components/operation-past-time-header/operation-past-time-header.component';
import { OperationPastTimeSearchFormComponent } from './components/operation-past-time-search-form/operation-past-time-search-form.component';
import { OperationPastTimeTableComponent } from './components/operation-past-time-table/operation-past-time-table.component';

@Component({
    selector: 'app-operation-past-time',
    templateUrl: './operation-past-time.component.html',
    styleUrls: ['./operation-past-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        OperationPastTimeHeaderComponent,
        OperationPastTimeSearchFormComponent,
        OperationPastTimeTableComponent,
        OperationSearchCardCComponent,
    ],
})
export class OperationPastTimeComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #titleService = inject(TitleService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    constructor() {
        this.#route.data
            .pipe(takeUntilDestroyed())
            .subscribe((data: { title: string }) => {
                this.#titleService.setTitle(data.title);
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
