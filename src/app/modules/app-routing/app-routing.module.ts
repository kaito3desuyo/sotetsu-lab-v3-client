import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TopComponent } from 'src/app/components/pages/top/top.component';
import { TimetableComponent } from 'src/app/components/pages/timetable/timetable.component';
import { AddTimetableComponent } from 'src/app/components/pages/timetable/add-timetable/add-timetable.component';
import { RealTimeComponent } from 'src/app/components/pages/operation/real-time/real-time.component';
import { TimetableAllLineComponent } from 'src/app/components/pages/timetable/timetable-all-line/timetable-all-line.component';

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
    data: { title: '全線時刻表' }
  },
  {
    path: 'timetable/add',
    component: AddTimetableComponent,
    data: { title: '列車を追加する' }
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
