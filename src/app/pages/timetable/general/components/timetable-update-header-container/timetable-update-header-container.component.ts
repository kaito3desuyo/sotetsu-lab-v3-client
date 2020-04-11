import { Component, OnInit } from '@angular/core';
import { TimetableUpdateService } from '../../services/timetable-update.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-timetable-update-header-container',
    templateUrl: './timetable-update-header-container.component.html',
    styleUrls: ['./timetable-update-header-container.component.scss'],
})
export class TimetableUpdateHeaderContainerComponent {
    calendar$: Observable<ICalendar>;

    constructor(private timetableUpdateService: TimetableUpdateService) {
        this.calendar$ = this.timetableUpdateService.getCalendar();
    }
}
