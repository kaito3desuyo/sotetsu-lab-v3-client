import { Routes, RouterModule } from '@angular/router';
import { TimetableAllLineComponent } from './timetable-all-line/timetable-all-line.component';
import { NgModule } from '@angular/core';
import { TimetableAllLineTableResolverService } from './general/services/timetable-all-line-table-resolver.service';

const routes: Routes = [
  {
    path: 'all-line/block/:blockId'
  },
  {
    path: 'all-line/:calendarId',
    component: TimetableAllLineComponent,
    resolve: {
      timetableAllLine: TimetableAllLineTableResolverService
    },
    data: {
      title: '全線時刻表'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimetableRoutingModule {}
