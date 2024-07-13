import { Component } from '@angular/core';
import { OperationTableHeaderPComponent } from '../operation-table-header-p/operation-table-header-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-table-header-c',
    templateUrl: './operation-table-header-c.component.html',
    styleUrls: ['./operation-table-header-c.component.scss'],
    imports: [OperationTableHeaderPComponent],
})
export class OperationTableHeaderCComponent {}
