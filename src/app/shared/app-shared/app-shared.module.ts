import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaddingPipe } from './pipes/padding.pipe';
import { CalendarCardHeaderPresentationalComponent } from './components/calendar-card-header-presentational/calendar-card-header-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RangePipe } from './pipes/range.pipe';
import { FindByIdPipe } from './pipes/find-by-id.pipe';
import { LoadingModule } from './loading/loading.module';

@NgModule({
    imports: [CommonModule, MatToolbarModule, LoadingModule],
    exports: [
        PaddingPipe,
        RangePipe,
        FindByIdPipe,
        CalendarCardHeaderPresentationalComponent
    ],
    declarations: [
        PaddingPipe,
        RangePipe,
        FindByIdPipe,
        CalendarCardHeaderPresentationalComponent
    ]
})
export class AppSharedModule {}
