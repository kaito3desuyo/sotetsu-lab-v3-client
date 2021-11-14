import { Component } from '@angular/core';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';

@Component({
    selector: 'app-operation-post-card-c',
    templateUrl: './operation-post-card-c.component.html',
    styleUrls: ['./operation-post-card-c.component.scss'],
})
export class OperationPostCardCComponent {
    readonly agencies$ = this.agencyListStateQuery.agencies$;

    constructor(private readonly agencyListStateQuery: AgencyListStateQuery) {}

    onReceiveSubmitSighting(formValue: IOperationPostCardForm): void {
        console.log(formValue);
    }
}
