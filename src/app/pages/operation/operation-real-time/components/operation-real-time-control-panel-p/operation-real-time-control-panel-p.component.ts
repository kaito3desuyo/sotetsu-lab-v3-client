import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-control-panel-p',
    templateUrl: './operation-real-time-control-panel-p.component.html',
    styleUrls: ['./operation-real-time-control-panel-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatSlideToggleModule],
})
export class OperationRealTimeControlPanelPComponent {
    @Input() isEnableAutoReload!: boolean;
    @Input() isVisibleCurrentPosition!: boolean;

    @Output() toggleAutoReload = new EventEmitter<boolean>();
    @Output() toggleVisibleCurrentPosition = new EventEmitter<boolean>();
}
