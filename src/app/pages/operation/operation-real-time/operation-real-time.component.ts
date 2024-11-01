import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OperationRealTimeHeaderCComponent } from './components/operation-real-time-header-c/operation-real-time-header-c.component';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        OperationRealTimeHeaderCComponent,
        OperationRealTimeMainCComponent,
    ],
})
export class OperationRealTimeComponent {}
