import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { DashboardService } from '../../services/dashboard.service';
import { IDashboardSearchTimetableForm } from '../../interfaces/dashboard-search-timetable-form';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-timetable-search-form-container',
  templateUrl: './dashboard-timetable-search-form-container.component.html',
  styleUrls: ['./dashboard-timetable-search-form-container.component.scss']
})
export class DashboardTimetableSearchFormContainerComponent {
  calendarsSelectList$: Observable<{ label: string; value: string }[]>;

  stationsSelectList$: Observable<
    { routeName: string; stations: { label: string; value: string }[] }[]
  > = this.routesAllStationsQuery.selectAll().pipe(
    map(route => {
      return this.routesAllStationsService.generateStationSelectList(route);
    })
  );
  constructor(
    private router: Router,
    private dashboardService: DashboardService,
    private routesAllStationsQuery: RoutesAllStationsQuery,
    private routesAllStationsService: RoutesAllStationsService
  ) {
    this.calendarsSelectList$ = this.dashboardService.getCalendarSelectList();
    this.stationsSelectList$.subscribe(data => {
      console.log(data);
    });
  }

  onReceiveSearchTimetable(form: IDashboardSearchTimetableForm): void {
    this.router.navigate([
      'timetable',
      'all-line',
      form.calendarId,
      { trip_direction: form.tripDirection }
    ]);
  }
}
