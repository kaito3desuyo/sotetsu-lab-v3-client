import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-operation-real-time-legend',
    templateUrl: './operation-real-time-legend.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    host: { class: 'tw-block' },
})
export class OperationRealTimeLegendComponent {}
