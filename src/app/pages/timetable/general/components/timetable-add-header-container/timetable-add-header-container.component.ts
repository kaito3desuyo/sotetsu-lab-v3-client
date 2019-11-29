import { Component } from '@angular/core';
import { TimetableAddService } from '../../services/timetable-add.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-timetable-add-header-container',
    templateUrl: './timetable-add-header-container.component.html',
    styleUrls: ['./timetable-add-header-container.component.scss']
})
export class TimetableAddHeaderContainerComponent {
    calendar$: Observable<ICalendar>;

    constructor(private timetableAddService: TimetableAddService) {
        this.calendar$ = this.timetableAddService.getCalendar();
    }
}
