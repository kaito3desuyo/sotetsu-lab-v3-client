import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaddingPipe } from './pipes/padding.pipe';
import { CalendarCardHeaderPresentationalComponent } from './components/calendar-card-header-presentational/calendar-card-header-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RangePipe } from './pipes/range.pipe';

@NgModule({
  imports: [CommonModule, MatToolbarModule],
  exports: [PaddingPipe, RangePipe, CalendarCardHeaderPresentationalComponent],
  declarations: [
    PaddingPipe,
    RangePipe,
    CalendarCardHeaderPresentationalComponent
  ],
  providers: []
})
export class AppSharedModule {}
