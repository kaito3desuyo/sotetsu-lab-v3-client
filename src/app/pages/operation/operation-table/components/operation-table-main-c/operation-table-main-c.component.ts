import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdsenseModule } from 'ng2-adsense';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';
import { OperationTableTableContainerComponent } from '../operation-table-table-container/operation-table-table-container.component';

@Component({
    selector: 'app-operation-table-main-c',
    templateUrl: './operation-table-main-c.component.html',
    styleUrls: ['./operation-table-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AdsenseModule,
        OperationSearchCardCComponent,
        OperationTableTableContainerComponent,
    ]
})
export class OperationTableMainCComponent {
    readonly #operationTableStateQuery = inject(OperationTableStateQuery);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );

    readonly #calendarId = toSignal(this.#operationTableStateQuery.calendarId$);

    constructor() {
        effect(() => {
            const calendarId = this.#calendarId();
            untracked(() => {
                this.#operationSearchCardStateStore.setCalendarId(calendarId);
            });
        });
    }
}
