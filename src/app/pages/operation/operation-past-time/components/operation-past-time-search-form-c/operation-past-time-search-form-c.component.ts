import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { RxPush } from '@rx-angular/template/push';
import { format } from 'date-fns';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationPastTimeSearchParam } from '../../types/operation-past-time.type';
import { OperationPastTimeSearchFormPComponent } from '../operation-past-time-search-form-p/operation-past-time-search-form-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-search-form-c',
    templateUrl: './operation-past-time-search-form-c.component.html',
    styleUrls: ['./operation-past-time-search-form-c.component.scss'],
    imports: [
        CommonModule,
        RouterModule,
        OperationPastTimeSearchFormPComponent,
        RxPush,
    ],
})
export class OperationPastTimeSearchFormCComponent {
    readonly #router = inject(Router);
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);

    readonly referenceDate$ = this.#operationPastTimeStateQuery.referenceDate$;
    readonly days$ = this.#operationPastTimeStateQuery.days$;

    onReceiveClickSearch(params: OperationPastTimeSearchParam): void {
        this.#router.navigate([
            'operation',
            'past-time',
            {
                reference_date: format(params.referenceDate, 'yyyy-MM-dd'),
                days: params.days,
            },
        ]);
    }
}
