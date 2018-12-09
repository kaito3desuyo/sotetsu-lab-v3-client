import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TopModule } from 'src/app/components/pages/top/top.module';
import { TimetableModule } from 'src/app/components/pages/timetable/timetable.module';
import { OperationModule } from 'src/app/components/pages/operation/operation.module';

@NgModule({
  imports: [TopModule, TimetableModule, OperationModule],
  exports: [RouterModule]
})
export class AppRoutingModule {}
