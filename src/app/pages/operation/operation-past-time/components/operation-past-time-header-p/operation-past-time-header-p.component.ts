import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-operation-past-time-header-p',
    templateUrl: './operation-past-time-header-p.component.html',
    styleUrls: ['./operation-past-time-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationPastTimeHeaderPComponent {}
