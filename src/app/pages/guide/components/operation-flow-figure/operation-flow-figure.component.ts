import { ChangeDetectionStrategy, Component } from '@angular/core';

/** 使い方の「相鉄の運用の流れ」の概念図。1 群の順送り（11 → … → 16 → 11）で例示する */
@Component({
    selector: 'app-operation-flow-figure',
    templateUrl: './operation-flow-figure.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'tw-block' },
})
export class OperationFlowFigureComponent {
    readonly ring = ['11', '12', '13', '14', '15', '16'];
}
