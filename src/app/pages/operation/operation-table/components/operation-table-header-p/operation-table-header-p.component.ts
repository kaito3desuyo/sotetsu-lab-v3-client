import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-operation-table-header-p',
    templateUrl: './operation-table-header-p.component.html',
    styleUrls: ['./operation-table-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationTableHeaderPComponent {}
