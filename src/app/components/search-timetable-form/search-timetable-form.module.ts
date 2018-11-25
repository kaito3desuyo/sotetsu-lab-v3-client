import { NgModule } from '@angular/core';
import { SearchTimetableFormComponent } from './search-timetable-form.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    AngularMaterialModule,
    FlexLayoutModule,
    FormsModule,
    BrowserModule,
    CommonModule
  ],
  exports: [SearchTimetableFormComponent],
  declarations: [SearchTimetableFormComponent]
})
export class SearchTimetableFormModule {}
