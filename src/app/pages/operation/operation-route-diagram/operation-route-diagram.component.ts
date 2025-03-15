import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationRouteDiagramHeaderCComponent } from './components/operation-route-diagram-header-c/operation-route-diagram-header-c.component';
import { OperationRouteDiagramMainCComponent } from './components/operation-route-diagram-main-c/operation-route-diagram-main-c.component';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStateQuery } from './states/operation-route-diagram.state';

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    styleUrls: ['./operation-route-diagram.component.scss'],
    imports: [
        OperationRouteDiagramHeaderCComponent,
        OperationRouteDiagramMainCComponent,
    ],
    providers: [RxState]
})
export class OperationRouteDiagramComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );
    readonly #operationRouteDiagramStateQuery = inject(
        OperationRouteDiagramStateQuery,
    );

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
            },
        );

        this.#state.hold(
            this.#operationSearchCardService.receiveSearchOperationRouteDiagramEvent(),
            (operationId) => {
                this.#router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
                ]);
            },
        );

        this.#state.hold(
            this.#operationRouteDiagramService.receiveNavigateTimetableEvent(),
            (ev) => {
                this.#router.navigate([
                    '/timetable',
                    'all-line',
                    {
                        calendar_id:
                            this.#operationRouteDiagramStateQuery.calendarId,
                        trip_block_id: ev.tripBlockId,
                        trip_direction: ev.tripDirection,
                    },
                ]);
            },
        );
    }
}
