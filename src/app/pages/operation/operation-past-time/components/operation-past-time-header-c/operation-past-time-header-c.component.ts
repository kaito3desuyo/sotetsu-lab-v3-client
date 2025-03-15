import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperationPastTimeHeaderPComponent } from '../operation-past-time-header-p/operation-past-time-header-p.component';

@Component({
    selector: 'app-operation-past-time-header-c',
    templateUrl: './operation-past-time-header-c.component.html',
    styleUrls: ['./operation-past-time-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationPastTimeHeaderPComponent]
})
export class OperationPastTimeHeaderCComponent {}
