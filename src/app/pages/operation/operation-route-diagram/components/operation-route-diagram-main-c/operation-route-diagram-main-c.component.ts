import { Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { filter } from 'rxjs/operators';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';
import { OperationRouteDiagramDrawingContainerComponent } from '../operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';

@Component({
    selector: 'app-operation-route-diagram-main-c',
    templateUrl: './operation-route-diagram-main-c.component.html',
    styleUrls: ['./operation-route-diagram-main-c.component.scss'],
    imports: [
        AdsenseModule,
        OperationRouteDiagramDrawingContainerComponent,
        OperationSearchCardCComponent,
    ],
    providers: [RxState]
})
export class OperationRouteDiagramMainCComponent {
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #operationRouteDiagramStateQuery = inject(
        OperationRouteDiagramStateQuery,
    );
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );

    constructor() {
        this.#state.hold(
            this.#operationRouteDiagramStateQuery.calendar$.pipe(
                filter((calendar) => !!calendar),
            ),
            (calendar) => {
                this.#operationSearchCardStateStore.setCalendarId(
                    calendar.calendarId,
                );
            },
        );

        this.#state.hold(
            this.#operationRouteDiagramStateQuery.operation$.pipe(
                filter((operation) => !!operation),
            ),
            (operation) => {
                this.#operationSearchCardStateStore.setOperationId(
                    operation.operationId,
                );
            },
        );
    }
}
