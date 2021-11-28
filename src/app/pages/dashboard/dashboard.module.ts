import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DashboardOperationSearchMenuContainerComponent } from './general/components/dashboard-operation-search-menu-container/dashboard-operation-search-menu-container.component';
import { DashboardOperationSearchMenuPresentationalComponent } from './general/components/dashboard-operation-search-menu-presentational/dashboard-operation-search-menu-presentational.component';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { DashboardTripAddFormContainerComponent } from './general/components/dashboard-trip-add-form-container/dashboard-trip-add-form-container.component';
import { DashboardTripAddFormPresentationalComponent } from './general/components/dashboard-trip-add-form-presentational/dashboard-trip-add-form-presentational.component';
import { DashboardResolverService } from './general/services/dashboard-resolver.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { DashboardService } from './general/services/dashboard.service';
import { TimetableSharedModule } from 'src/app/shared/timetable-shared/timetable-shared.module';
import { AdsenseModule } from 'ng2-adsense';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { DashboardMainCComponent } from './components/dashboard-main-c/dashboard-main-c.component';
import { DashboardDescriptionPComponent } from './components/dashboard-description-p/dashboard-description-p.component';
import { OperationPostCardModule } from 'src/app/shared/operation-post-card/operation-post-card.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetablePostCardModule } from 'src/app/shared/timetable-post-card/timetable-post-card.module';

@NgModule({
    declarations: [
        DashboardComponent,
        DashboardOperationSearchMenuContainerComponent,
        DashboardOperationSearchMenuPresentationalComponent,
        DashboardTripAddFormContainerComponent,
        DashboardTripAddFormPresentationalComponent,
        DashboardMainCComponent,
        DashboardDescriptionPComponent,
    ],
    imports: [
        CommonModule,
        FlexLayoutModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatCardModule,
        MatFormFieldModule,
        MatRadioModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatButtonModule,
        MatListModule,
        MatInputModule,
        DashboardRoutingModule,
        OperationSharedModule,
        TimetableSharedModule,
        AdsenseModule,
        OperationSearchCardModule,
        OperationPostCardModule,
        TimetableSearchCardModule,
        TimetablePostCardModule,
    ],
    providers: [DashboardService, DashboardResolverService],
})
export class DashboardModule {}
