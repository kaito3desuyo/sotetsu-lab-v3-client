import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

@Component({
    selector: 'app-operation-real-time-control-panel-p',
    templateUrl: './operation-real-time-control-panel-p.component.html',
    styleUrls: ['./operation-real-time-control-panel-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRealTimeControlPanelPComponent {
    @Input() isEnableAutoReload!: boolean;
    @Input() isVisibleCurrentPosition!: boolean;

    @Output() toggleAutoReload = new EventEmitter<boolean>();
    @Output() toggleVisibleCurrentPosition = new EventEmitter<boolean>();

    constructor() {}
}
