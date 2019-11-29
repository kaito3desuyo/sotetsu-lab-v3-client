import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
    Input
} from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Moment } from 'moment';

@Component({
    selector: 'app-operation-sightings-control-panel-presentational',
    templateUrl:
        './operation-sightings-control-panel-presentational.component.html',
    styleUrls: [
        './operation-sightings-control-panel-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsControlPanelPresentationalComponent {
    @Input() finalUpdateTime: Moment;
    @Input() autoReloadEnabled: boolean;
    @Input() visibleCurrentPosition: boolean;
    @Output() changeAutoReloadToggle: EventEmitter<boolean> = new EventEmitter<
        boolean
    >();
    @Output() changeVisibleCurrentPositionToggle: EventEmitter<
        boolean
    > = new EventEmitter<boolean>();

    constructor() {}

    onChangeAutoReloadToggle(event: MatSlideToggleChange) {
        this.changeAutoReloadToggle.emit(event.checked);
    }

    onChangeVisibleCurrentPositionToggle(event: MatSlideToggleChange) {
        this.changeVisibleCurrentPositionToggle.emit(event.checked);
    }
}
