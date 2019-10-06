import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaddingPipe } from './pipes/padding.pipe';
import { CalendarCardHeaderPresentationalComponent } from './components/calendar-card-header-presentational/calendar-card-header-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';

@NgModule({
  imports: [CommonModule, MatToolbarModule],
  exports: [PaddingPipe, CalendarCardHeaderPresentationalComponent],
  declarations: [PaddingPipe, CalendarCardHeaderPresentationalComponent],
  providers: []
})
export class AppSharedModule {}
