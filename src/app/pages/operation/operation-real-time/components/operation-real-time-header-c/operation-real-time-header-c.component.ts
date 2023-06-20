import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';
import { OperationRealTimeHeaderPComponent } from '../operation-real-time-header-p/operation-real-time-header-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-header-c',
    templateUrl: './operation-real-time-header-c.component.html',
    styleUrls: ['./operation-real-time-header-c.component.scss'],
    imports: [CommonModule, OperationRealTimeHeaderPComponent],
})
export class OperationRealTimeHeaderCComponent {
    private readonly operationRealTimeStateQuery = inject(
        OperationRealTimeStateQuery
    );

    readonly finalUpdateTime$ =
        this.operationRealTimeStateQuery.finalUpdateTime$;
}
