import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CalendarCardHeaderPresentationalComponent } from './components/calendar-card-header-presentational/calendar-card-header-presentational.component';
import { LoadingModule } from './loading/loading.module';
import { FindByIdPipe } from './pipes/find-by-id.pipe';
import { PaddingPipe } from './pipes/padding.pipe';

@NgModule({
    imports: [CommonModule, MatToolbarModule, LoadingModule],
    exports: [
        PaddingPipe,
        FindByIdPipe,
        CalendarCardHeaderPresentationalComponent,
    ],
    declarations: [
        PaddingPipe,
        FindByIdPipe,
        CalendarCardHeaderPresentationalComponent,
    ],
})
export class AppSharedModule {}
