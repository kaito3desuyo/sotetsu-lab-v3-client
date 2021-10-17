import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { TimetableCopyService } from '../../services/timetable-copy.service';

@Component({
    selector: 'app-timetable-copy-header-container',
    templateUrl: './timetable-copy-header-container.component.html',
    styleUrls: ['./timetable-copy-header-container.component.scss'],
})
export class TimetableCopyHeaderContainerComponent {
    calendar$: Observable<ICalendar>;

    constructor(private timetableCopyService: TimetableCopyService) {
        this.calendar$ = this.timetableCopyService.getCalendar();
    }
}
