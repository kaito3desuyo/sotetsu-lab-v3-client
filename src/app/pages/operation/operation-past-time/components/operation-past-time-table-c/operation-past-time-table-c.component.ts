import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationPastTimeTablePComponent } from '../operation-past-time-table-p/operation-past-time-table-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-table-c',
    templateUrl: './operation-past-time-table-c.component.html',
    styleUrls: ['./operation-past-time-table-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationPastTimeTablePComponent],
})
export class OperationPastTimeTableCComponent {
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);

    readonly calendars = toSignal(this.#operationPastTimeStateQuery.calendars$);
    readonly formations = toSignal(
        this.#operationPastTimeStateQuery.formations$,
    );
    readonly operationSightings = toSignal(
        this.#operationPastTimeStateQuery.selectOperationSightingsGroupedByDate(),
    );

    readonly tableDisplayed = computed(() => {
        const calendars = this.calendars();
        return !!calendars.length;
    });
}
