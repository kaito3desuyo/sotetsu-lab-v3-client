import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddTimetablePreFormComponent } from './add-timetable-pre-form.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PipesModule } from 'src/app/modules/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    AngularMaterialModule,
    FlexLayoutModule,
    FormsModule,
    PipesModule.forRoot(),
    ReactiveFormsModule
  ],
  exports: [AddTimetablePreFormComponent],
  declarations: [AddTimetablePreFormComponent]
})
export class AddTimetablePreFormModule {}
