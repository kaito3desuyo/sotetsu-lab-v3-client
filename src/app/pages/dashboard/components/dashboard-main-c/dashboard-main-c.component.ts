import { Component } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { LibraryListCardCComponent } from 'src/app/shared/library-list-card/components/library-list-card-c/library-list-card-c.component';
import { NewOperationPostCardComponent } from 'src/app/shared/new-operation-post-card/new-operation-post-card.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { TimetablePostCardCComponent } from 'src/app/shared/timetable-post-card/components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { DashboardDescriptionPComponent } from '../dashboard-description-p/dashboard-description-p.component';

@Component({
    selector: 'app-dashboard-main-c',
    templateUrl: './dashboard-main-c.component.html',
    styleUrls: ['./dashboard-main-c.component.scss'],
    imports: [
        AdsenseModule,
        DashboardDescriptionPComponent,
        OperationSearchCardCComponent,
        TimetableSearchCardCComponent,
        TimetablePostCardCComponent,
        LibraryListCardCComponent,
        NewOperationPostCardComponent,
    ],
})
export class DashboardMainCComponent {}
