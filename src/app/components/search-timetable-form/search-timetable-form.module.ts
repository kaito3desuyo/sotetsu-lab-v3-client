import { NgModule } from '@angular/core';
import { SearchTimetableFormComponent } from './search-timetable-form.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [AngularMaterialModule, FlexLayoutModule, FormsModule],
  exports: [SearchTimetableFormComponent],
  declarations: [SearchTimetableFormComponent]
})
export class SearchTimetableFormModule {}
