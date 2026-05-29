import { Component } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import { LibraryListCardModule } from 'src/app/shared/library-list-card/library-list-card.module';
import { NewOperationPostCardComponent } from 'src/app/shared/new-operation-post-card/new-operation-post-card.component';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { TimetablePostCardModule } from 'src/app/shared/timetable-post-card/timetable-post-card.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { DashboardDescriptionPComponent } from '../dashboard-description-p/dashboard-description-p.component';

@Component({
    selector: 'app-dashboard-main-c',
    templateUrl: './dashboard-main-c.component.html',
    styleUrls: ['./dashboard-main-c.component.scss'],
    imports: [
        AdsenseModule,
        //
        DashboardDescriptionPComponent,
        //
        OperationSearchCardModule,
        TimetableSearchCardModule,
        TimetablePostCardModule,
        LibraryListCardModule,
        // OPERATION_SEARCH_CARD_DECLARATIONS,
        // OPERATION_POST_CARD_DECLARATIONS,
        // TIMETABLE_SEARCH_CARD_DECLARATIONS,
        // TIMETABLE_POST_CARD_DECLARATIONS,
        // LIBRARY_LIST_CARD_DECLARATIONS,
        NewOperationPostCardComponent,
    ],
})
export class DashboardMainCComponent {}
