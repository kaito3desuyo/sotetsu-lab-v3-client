import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { AdsenseModule } from 'ng2-adsense';
import { LibraryListCardModule } from 'src/app/shared/library-list-card/library-list-card.module';
import { OperationPostCardModule } from 'src/app/shared/operation-post-card/operation-post-card.module';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { TimetablePostCardModule } from 'src/app/shared/timetable-post-card/timetable-post-card.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableSharedModule } from 'src/app/shared/timetable-shared/timetable-shared.module';
import { DashboardDescriptionPComponent } from './components/dashboard-description-p/dashboard-description-p.component';
import { DashboardMainCComponent } from './components/dashboard-main-c/dashboard-main-c.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
    declarations: [
        DashboardComponent,
        DashboardMainCComponent,
        DashboardDescriptionPComponent,
    ],
    imports: [
        CommonModule,
        FlexLayoutModule,
        MatCardModule,
        DashboardRoutingModule,
        OperationSharedModule,
        TimetableSharedModule,
        AdsenseModule,
        OperationSearchCardModule,
        OperationPostCardModule,
        TimetableSearchCardModule,
        TimetablePostCardModule,
        LibraryListCardModule,
    ],
    providers: [],
})
export class DashboardModule {}
