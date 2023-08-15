import { Component } from '@angular/core';
import OPERATION_SEARCH_CARD_DECLARATIONS from 'src/app/shared/operation-search-card/operation-search-card.declaration';
import { OperationPastTimeSearchFormCComponent } from '../operation-past-time-search-form-c/operation-past-time-search-form-c.component';
import { OperationPastTimeTableCComponent } from '../operation-past-time-table-c/operation-past-time-table-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-main-c',
    templateUrl: './operation-past-time-main-c.component.html',
    styleUrls: ['./operation-past-time-main-c.component.scss'],
    imports: [
        OperationPastTimeSearchFormCComponent,
        OperationPastTimeTableCComponent,
        ...OPERATION_SEARCH_CARD_DECLARATIONS,
    ],
})
export class OperationPastTimeMainCComponent {}
