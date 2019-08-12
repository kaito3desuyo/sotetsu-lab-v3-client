import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';

@Component({
  selector: 'app-dashboard-trip-add-form-container',
  templateUrl: './dashboard-trip-add-form-container.component.html',
  styleUrls: ['./dashboard-trip-add-form-container.component.scss']
})
export class DashboardTripAddFormContainerComponent implements OnInit {
  calendersSelectList$: Observable<
    { label: string; value: string }[]
  > = this.calendersQuery
    .selectAll()
    .pipe(
      map(calender =>
        this.calendersService.generateCalenderSelectList(calender)
      )
    );
  constructor(
    private calendersQuery: CalendersQuery,
    private calendersService: CalendersService
  ) {}

  ngOnInit() {}
}
