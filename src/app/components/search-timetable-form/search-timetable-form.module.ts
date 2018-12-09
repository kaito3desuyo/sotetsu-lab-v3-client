import { NgModule } from '@angular/core';
import { SearchTimetableFormComponent } from './search-timetable-form.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { PipesModule } from 'src/app/modules/pipes/pipes.module';

@NgModule({
  imports: [
    AngularMaterialModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    CommonModule,
    PipesModule.forRoot()
  ],
  exports: [SearchTimetableFormComponent],
  declarations: [SearchTimetableFormComponent]
})
export class SearchTimetableFormModule {}
