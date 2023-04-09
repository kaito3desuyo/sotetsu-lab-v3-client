import { Component } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { LibraryListCardCComponent } from 'src/app/shared/library-list-card/components/library-list-card-c/library-list-card-c.component';
import { OperationPostCardCComponent } from 'src/app/shared/operation-post-card/components/operation-post-card-c/operation-post-card-c.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { TimetablePostCardCComponent } from 'src/app/shared/timetable-post-card/components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { DashboardDescriptionPComponent } from '../dashboard-description-p/dashboard-description-p.component';

@Component({
    standalone: true,
    selector: 'app-dashboard-main-c',
    templateUrl: './dashboard-main-c.component.html',
    styleUrls: ['./dashboard-main-c.component.scss'],
    imports: [
        AdsenseModule,
        //
        DashboardDescriptionPComponent,
        //
        OperationSearchCardCComponent,
        OperationPostCardCComponent,
        TimetableSearchCardCComponent,
        TimetablePostCardCComponent,
        LibraryListCardCComponent,
    ],
})
export class DashboardMainCComponent {}
