import { Component, OnInit } from '@angular/core';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
  selector: 'app-timetable-all-line-header-container',
  templateUrl: './timetable-all-line-header-container.component.html',
  styleUrls: ['./timetable-all-line-header-container.component.scss']
})
export class TimetableAllLineHeaderContainerComponent implements OnInit {
  calendar$: Observable<ICalendar>;
  tripDirection$: Observable<'0' | '1'>;
  constructor(private timetableAllLineService: TimetableAllLineService) {
    this.calendar$ = this.timetableAllLineService.getCalendar();
    this.tripDirection$ = this.timetableAllLineService.getTripDirection();
  }

  ngOnInit() {}
}
