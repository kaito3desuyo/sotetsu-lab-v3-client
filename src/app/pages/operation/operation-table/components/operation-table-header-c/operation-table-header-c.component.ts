import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperationTableHeaderPComponent } from '../operation-table-header-p/operation-table-header-p.component';

@Component({
    selector: 'app-operation-table-header-c',
    templateUrl: './operation-table-header-c.component.html',
    styleUrls: ['./operation-table-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationTableHeaderPComponent]
})
export class OperationTableHeaderCComponent {}
