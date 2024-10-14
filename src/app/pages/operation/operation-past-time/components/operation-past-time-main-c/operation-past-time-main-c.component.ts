import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationPastTimeSearchFormCComponent } from '../operation-past-time-search-form-c/operation-past-time-search-form-c.component';
import { OperationPastTimeTableCComponent } from '../operation-past-time-table-c/operation-past-time-table-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-main-c',
    templateUrl: './operation-past-time-main-c.component.html',
    styleUrls: ['./operation-past-time-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        OperationPastTimeSearchFormCComponent,
        OperationPastTimeTableCComponent,
        OperationSearchCardCComponent,
    ],
})
export class OperationPastTimeMainCComponent {}
