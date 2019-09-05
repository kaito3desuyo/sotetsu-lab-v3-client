import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';

@Component({
  selector: 'app-dashboard-operation-search-menu-container',
  templateUrl: './dashboard-operation-search-menu-container.component.html',
  styleUrls: ['./dashboard-operation-search-menu-container.component.scss']
})
export class DashboardOperationSearchMenuContainerComponent implements OnInit {
  calendersSelectList$: Observable<
    { label: string; value: string }[]
  > = this.calendersQuery
    .selectAll()
    .pipe(
      map(calender =>
        this.calendersService.generateCalenderSelectList(calender)
      )
    );
  todaysCalender$: Observable<{ id: string }> = this.currentParamsQuery
    .calender$;

  constructor(
    private calendersQuery: CalendersQuery,
    private calendersService: CalendersService,
    private currentParamsQuery: CurrentParamsQuery
  ) {}

  ngOnInit() {}
}
