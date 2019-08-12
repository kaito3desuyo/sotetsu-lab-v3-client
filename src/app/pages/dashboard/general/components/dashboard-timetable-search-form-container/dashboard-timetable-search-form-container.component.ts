import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';

@Component({
  selector: 'app-dashboard-timetable-search-form-container',
  templateUrl: './dashboard-timetable-search-form-container.component.html',
  styleUrls: ['./dashboard-timetable-search-form-container.component.scss']
})
export class DashboardTimetableSearchFormContainerComponent {
  calendersSelectList$: Observable<
    { label: string; value: string }[]
  > = this.calendersQuery
    .selectAll()
    .pipe(
      map(calender =>
        this.calendersService.generateCalenderSelectList(calender)
      )
    );
  stationsSelectList$: Observable<
    { routeName: string; stations: { label: string; value: string }[] }[]
  > = this.routesAllStationsQuery.selectAll().pipe(
    map(route => {
      return this.routesAllStationsService.generateStationSelectList(route);
    })
  );
  constructor(
    private calendersQuery: CalendersQuery,
    private calendersService: CalendersService,
    private routesAllStationsQuery: RoutesAllStationsQuery,
    private routesAllStationsService: RoutesAllStationsService
  ) {
    this.stationsSelectList$.subscribe(data => {
      console.log(data);
    });
  }
}
