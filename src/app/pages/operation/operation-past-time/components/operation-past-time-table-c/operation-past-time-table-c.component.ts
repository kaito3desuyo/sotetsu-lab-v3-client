import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RxIf } from '@rx-angular/template/if';
import { RxPush } from '@rx-angular/template/push';
import { map } from 'rxjs/operators';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationPastTimeTablePComponent } from '../operation-past-time-table-p/operation-past-time-table-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-table-c',
    templateUrl: './operation-past-time-table-c.component.html',
    styleUrls: ['./operation-past-time-table-c.component.scss'],
    imports: [CommonModule, OperationPastTimeTablePComponent, RxIf, RxPush],
})
export class OperationPastTimeTableCComponent {
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);

    readonly calendars$ = this.#operationPastTimeStateQuery.calendars$;
    readonly formations$ = this.#operationPastTimeStateQuery.formations$;
    readonly operationSightings$ =
        this.#operationPastTimeStateQuery.selectOperationSightingsGroupedByDate();

    readonly tableDisplayed$ = this.calendars$.pipe(map((o) => !!o.length));
    readonly tableNotDisplayed$ = this.calendars$.pipe(map((o) => !o.length));
}
