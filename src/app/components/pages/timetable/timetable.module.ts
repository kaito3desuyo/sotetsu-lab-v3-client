import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableComponent } from './timetable.component';
import { Routes, RouterModule } from '@angular/router';
import { AddTimetableComponent } from './add-timetable/add-timetable.component';
import { AddTimetableModule } from './add-timetable/add-timetable.module';

const routes: Routes = [
  { path: 'Timetable', component: TimetableComponent },
  { path: 'Timetable/add', component: AddTimetableComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes), CommonModule, AddTimetableModule],
  declarations: [TimetableComponent]
})
export class TimetableModule {}
