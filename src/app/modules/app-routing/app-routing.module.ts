import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes,
  Router,
  NavigationStart,
  NavigationEnd
} from '@angular/router';
import { TopComponent } from 'src/app/components/pages/top/top.component';
import { TimetableComponent } from 'src/app/components/pages/timetable/timetable.component';
import { AddTimetableComponent } from 'src/app/components/pages/timetable/add-timetable/add-timetable.component';
import { RealTimeComponent } from 'src/app/components/pages/operation/real-time/real-time.component';
import { TimetableAllLineComponent } from 'src/app/components/pages/timetable/timetable-all-line/timetable-all-line.component';
import {
  StationsResolverService,
  StationTimesByIdResolverService
} from 'src/app/services/stations-resolver.service';
import {
  TripsResolverService,
  TripsCountResolverService,
  TripByIdResolverService,
  TripsGroupByOperationsResolverService
} from 'src/app/services/trips-resolver.service';
import {
  CalenderByIdResolverService,
  CalenderByDateResolverService
} from 'src/app/services/calender-resolver.service';
import { TimetableStationComponent } from 'src/app/components/pages/timetable/timetable-station/timetable-station.component';
import {
  OperationsByDateResolverService,
  OperationSightingsByLatestSightingResolverService,
  OperationsByCalenderIdResolverService,
  OperationsByOperationIdResolverService
} from 'src/app/services/operations-resolver.service';
import { ServicesResolverService } from 'src/app/services/services-resolver.service';
import { TimetableEditorComponent } from 'src/app/components/pages/timetable/timetable-editor/timetable-editor.component';
import * as moment from 'moment';
import { fromEvent } from 'rxjs';
import { debounceTime, tap, filter, observeOn, scan } from 'rxjs/operators';
import { OperationTableComponent } from 'src/app/components/pages/operation/table/operation-table.component';
import { OperationRouteDiagramComponent } from 'src/app/components/pages/operation/route-diagram/operation-route-diagram.component';

const routes: Routes = [
  { path: '', component: TopComponent, data: { title: '' } },
  {
    path: 'timetable',
    component: TimetableComponent,
    data: { title: '時刻表' }
  },
  {
    path: 'timetable/all-line',
    component: TimetableAllLineComponent,
    data: { title: '全線時刻表' },
    resolve: {
      stations: StationsResolverService,
      trips: TripsResolverService,
      tripsCount: TripsCountResolverService,
      calender: CalenderByIdResolverService,
      sightings: OperationSightingsByLatestSightingResolverService
    }
  },
  {
    path: 'timetable/station',
    component: TimetableStationComponent,
    data: { title: '駅時刻表' },
    resolve: {
      timeOfStation: StationTimesByIdResolverService,
      calender: CalenderByIdResolverService,
      sightings: OperationSightingsByLatestSightingResolverService
    }
  },
  {
    path: 'timetable/add',
    component: TimetableEditorComponent,
    data: { title: '列車を追加する' },
    resolve: {
      services: ServicesResolverService,
      stations: StationsResolverService,
      calender: CalenderByIdResolverService
    }
  },
  {
    path: 'timetable/edit',
    component: TimetableEditorComponent,
    data: { title: '列車を編集する' },
    resolve: {
      services: ServicesResolverService,
      stations: StationsResolverService,
      calender: CalenderByIdResolverService,
      trip: TripByIdResolverService
    }
  },
  {
    path: 'operation/real-time',
    component: RealTimeComponent,
    data: {
      title: 'リアルタイム運用情報',
      date: moment()
        .subtract(Number(moment().format('H')) < 4 ? 1 : 0, 'days')
        .format('YYYYMMDD')
    },
    resolve: {
      calender: CalenderByDateResolverService,
      stations: StationsResolverService,
      trips: TripsGroupByOperationsResolverService
    }
  },
  {
    path: 'operation/table',
    component: OperationTableComponent,
    data: {
      title: '運用表'
    },
    resolve: {
      calender: CalenderByIdResolverService,
      stations: StationsResolverService,
      operationsByCalenderId: OperationsByCalenderIdResolverService
    }
  },
  {
    path: 'operation/route-diagram',
    component: OperationRouteDiagramComponent,
    data: {
      title: '運用行路図'
    },
    resolve: {
      stations: StationsResolverService,
      operationByOperationId: OperationsByOperationIdResolverService
    }
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
