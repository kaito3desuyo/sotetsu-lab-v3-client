import { Routes, RouterModule } from '@angular/router';
import { TimetableAllLineComponent } from './timetable-all-line/timetable-all-line.component';
import { NgModule } from '@angular/core';
import { TimetableAllLineTableResolverService } from './general/services/timetable-all-line-table-resolver.service';
import { TimetableAddComponent } from './timetable-add/timetable-add.component';
import { TimetableAddResolverService } from './general/services/timetable-add-resolver.service';
import { TimetableUpdateComponent } from './timetable-update/timetable-update.component';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';

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
  },
  {
    path: 'add/:calendarId',
    component: TimetableAddComponent,
    resolve: {
      from: TimetableAddResolverService
    },
    data: {
      title: '列車を追加する'
    }
  },
  {
    path: 'update/:blockId',
    component: TimetableUpdateComponent,
    resolve: {
      from: TimetableUpdateResolverService
    },
    data: {
      title: '列車を編集する'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimetableRoutingModule {}
