import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { ParamsQuery } from 'src/app/state/params';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { TimetableSearchFormService } from '../../services/timetable-search-form.service';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ITimetableSearchForm } from '../../interfaces/timetable-search-form';

@Component({
  selector: 'app-timetable-search-form-container',
  templateUrl: './timetable-search-form-container.component.html',
  styleUrls: ['./timetable-search-form-container.component.scss']
})
export class TimetableSearchFormContainerComponent {
  calendars$: Observable<ICalendar[]>;
  params$: Observable<ITimetableSearchForm>;
  stationsSelectList$: Observable<
    { routeName: string; stations: { label: string; value: string }[] }[]
  >;
  todaysCalendarId$: Observable<string>;

  constructor(
    private router: Router,
    private routesAllStationsQuery: RoutesAllStationsQuery,
    private routesAllStationsService: RoutesAllStationsService,
    private timetableSearchFormService: TimetableSearchFormService
  ) {
    this.calendars$ = this.timetableSearchFormService.getCalendars();
    this.params$ = this.timetableSearchFormService.getParams();
    this.stationsSelectList$ = this.routesAllStationsQuery.selectAll().pipe(
      map(route => {
        return this.routesAllStationsService.generateStationSelectList(route);
      })
    );
  }

  onReceiveSearchTimetable(form: ITimetableSearchForm): void {
    this.timetableSearchFormService.setParams(form);
    if (form.isSearchStation) {
      this.router.navigate([
        'timetable',
        form.calendarId,
        'station',
        form.stationId,
        { trip_direction: form.tripDirection }
      ]);
    } else {
      this.router.navigate([
        'timetable',
        form.calendarId,
        'all-line',
        { trip_direction: form.tripDirection }
      ]);
    }
  }
}
