import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
  TripByIdResolverService
} from 'src/app/services/trips-resolver.service';
import { CalenderByIdResolverService } from 'src/app/services/calender-resolver.service';
import { TimetableStationComponent } from 'src/app/components/pages/timetable/timetable-station/timetable-station.component';
import {
  OperationsByDateResolverService,
  OperationSightingsByLatestSightingResolverService
} from 'src/app/services/operations-resolver.service';
import { ServicesResolverService } from 'src/app/services/services-resolver.service';
import { TimetableEditorComponent } from 'src/app/components/pages/timetable/timetable-editor/timetable-editor.component';

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
    data: { title: 'リアルタイム運用情報' }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
