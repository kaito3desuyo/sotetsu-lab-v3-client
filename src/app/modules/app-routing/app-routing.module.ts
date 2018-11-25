import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TopModule } from 'src/app/components/pages/top/top.module';
import { TimetableModule } from 'src/app/components/pages/timetable/timetable.module';

@NgModule({
  imports: [TopModule, TimetableModule],
  exports: [RouterModule]
})
export class AppRoutingModule {}
