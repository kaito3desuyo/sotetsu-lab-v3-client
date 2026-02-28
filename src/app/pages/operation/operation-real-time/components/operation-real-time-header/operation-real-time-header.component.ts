import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

@Component({
    selector: 'app-operation-real-time-header',
    templateUrl: './operation-real-time-header.component.html',
    styleUrl: './operation-real-time-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DateFnsPipe],
})
export class OperationRealTimeHeaderComponent {
    finalUpdateTime = toSignal(OperationRealTimeStore.finalUpdateTime$);
}
