import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationTableHeaderCComponent } from './components/operation-table-header-c/operation-table-header-c.component';
import { OperationTableMainCComponent } from './components/operation-table-main-c/operation-table-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
    imports: [OperationTableHeaderCComponent, OperationTableMainCComponent],
    providers: [RxState],
})
export class OperationTableComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });

        this.#state.hold(
            this.#operationSearchCardService.receiveSearchOperationTableEvent(),
            (calendarId) => {
                this.#router.navigate([
                    '/operation/table',
                    { calendar_id: calendarId },
                ]);
            }
        );

        this.#state.hold(
            this.#operationSearchCardService.receiveSearchOperationRouteDiagramEvent(),
            (operationId) => {
                this.#router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
                ]);
            }
        );
    }
}
