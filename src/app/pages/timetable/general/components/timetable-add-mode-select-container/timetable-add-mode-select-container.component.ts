import { Component, OnInit } from '@angular/core';
import { TimetableAddService } from '../../services/timetable-add.service';

@Component({
    selector: 'app-timetable-add-mode-select-container',
    templateUrl: './timetable-add-mode-select-container.component.html',
    styleUrls: ['./timetable-add-mode-select-container.component.scss'],
})
export class TimetableAddModeSelectContainerComponent {
    constructor(private timetableAddService: TimetableAddService) {}

    onReceiveChangeIsSaveTripsIndividually(bool: boolean) {
        this.timetableAddService.setIsSaveTripsIndividually(bool);
    }
}
