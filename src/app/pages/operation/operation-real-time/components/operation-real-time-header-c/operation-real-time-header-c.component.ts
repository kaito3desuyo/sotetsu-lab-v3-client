import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';
import { OperationRealTimeHeaderPComponent } from '../operation-real-time-header-p/operation-real-time-header-p.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-header-c',
    templateUrl: './operation-real-time-header-c.component.html',
    styleUrls: ['./operation-real-time-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, OperationRealTimeHeaderPComponent],
})
export class OperationRealTimeHeaderCComponent {
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    readonly finalUpdateTime = toSignal(
        this.#operationRealTimeStateQuery.finalUpdateTime$,
    );
}
