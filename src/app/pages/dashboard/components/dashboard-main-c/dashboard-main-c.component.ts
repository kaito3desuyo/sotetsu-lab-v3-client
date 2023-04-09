import { Component } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';
import LIBRARY_LIST_CARD_DECLARATIONS from 'src/app/shared/library-list-card/library-list-card.declaration';
import OPERATION_POST_CARD_DECLARATIONS from 'src/app/shared/operation-post-card/operation-post-card.declaration';
import OPERATION_SEARCH_CARD_DECLARATIONS from 'src/app/shared/operation-search-card/operation-search-card.declaration';
import TIMETABLE_POST_CARD_DECLARATIONS from 'src/app/shared/timetable-post-card/timetable-post-card.declaration';
import TIMETABLE_SEARCH_CARD_DECLARATIONS from 'src/app/shared/timetable-search-card/timetable-search-card.declaration';
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

        OPERATION_SEARCH_CARD_DECLARATIONS,
        OPERATION_POST_CARD_DECLARATIONS,
        TIMETABLE_SEARCH_CARD_DECLARATIONS,
        TIMETABLE_POST_CARD_DECLARATIONS,
        LIBRARY_LIST_CARD_DECLARATIONS,
    ],
})
export class DashboardMainCComponent {}
