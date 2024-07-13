import { Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';
import { OperationTableTableContainerComponent } from '../operation-table-table-container/operation-table-table-container.component';

@Component({
    standalone: true,
    selector: 'app-operation-table-main-c',
    templateUrl: './operation-table-main-c.component.html',
    styleUrls: ['./operation-table-main-c.component.scss'],
    imports: [
        AdsenseModule,
        OperationSearchCardCComponent,
        OperationTableTableContainerComponent,
    ],
    providers: [RxState],
})
export class OperationTableMainCComponent {
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #operationTableStateQuery = inject(OperationTableStateQuery);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore
    );

    constructor() {
        this.#state.hold(
            this.#operationTableStateQuery.calendarId$,
            (calendarId) => {
                this.#operationSearchCardStateStore.setCalendarId(calendarId);
            }
        );
    }
}
