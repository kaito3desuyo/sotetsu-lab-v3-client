import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddTimetableComponent } from './add-timetable.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    AngularMaterialModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ],
  exports: [AddTimetableComponent],
  declarations: [AddTimetableComponent]
})
export class AddTimetableModule {}
