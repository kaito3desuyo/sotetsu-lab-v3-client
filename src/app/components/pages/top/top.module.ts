import { NgModule } from '@angular/core';
import { TopComponent } from './top.component';
import { Routes, RouterModule } from '@angular/router';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SearchTimetableFormModule } from '../../search-timetable-form/search-timetable-form.module';
import { AddTimetablePreFormModule } from '../../add-timetable-pre-form/add-timetable-pre-form.module';
import { AddOperationSightingFormModule } from '../../add-operation-sighting-form/add-operation-sighting-form.module';

const routes: Routes = [{ path: '', component: TopComponent }];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    AngularMaterialModule,
    FlexLayoutModule,
    SearchTimetableFormModule,
    AddTimetablePreFormModule,
    AddOperationSightingFormModule
  ],
  declarations: [TopComponent]
})
export class TopModule {}
