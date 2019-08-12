import { Component, OnInit } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-sidenav-container',
  templateUrl: './sidenav-container.component.html',
  styleUrls: ['./sidenav-container.component.scss']
})
export class SidenavContainerComponent implements OnInit {
  stationsSelectList$ = this.routesAllStationsQuery
    .selectAll()
    .pipe(
      map(routes =>
        this.routesAllStationsService.generateStationSelectList(routes)
      )
    );
  sidenavState$ = this.sidenavService.getState();
  sidenavState = false;

  constructor(
    private sidenavService: SidenavService,
    private routesAllStationsQuery: RoutesAllStationsQuery,
    private routesAllStationsService: RoutesAllStationsService
  ) {}

  ngOnInit() {
    this.sidenavState$.subscribe(bool => {
      this.sidenavState = bool;
    });
    this.routesAllStationsService.get().subscribe();
    this.routesAllStationsQuery.selectAll().subscribe(data => {
      console.log(data);
    });
  }
}
