import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
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
    readonly isEnableAutoReload = input.required<boolean>();
    readonly isVisibleSightingHistories = input.required<boolean>();
    readonly isVisibleCurrentPosition = input.required<boolean>();

    readonly toggleAutoReload = output<boolean>();
    readonly toggleVisibleSightingHistories = output<boolean>();
    readonly toggleVisibleCurrentPosition = output<boolean>();
}
