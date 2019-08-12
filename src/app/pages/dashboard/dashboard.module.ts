import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { DashboardTimetableSearchFormContainerComponent } from './general/components/dashboard-timetable-search-form-container/dashboard-timetable-search-form-container.component';
import { DashboardTimetableSearchFormPresentationalComponent } from './general/components/dashboard-timetable-search-form-presentational/dashboard-timetable-search-form-presentational.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DashboardOperationSearchMenuContainerComponent } from './general/components/dashboard-operation-search-menu-container/dashboard-operation-search-menu-container.component';
import { DashboardOperationSearchMenuPresentationalComponent } from './general/components/dashboard-operation-search-menu-presentational/dashboard-operation-search-menu-presentational.component';
import { MatListModule } from '@angular/material/list';
import { DashboardOperationSightingAddFormContainerComponent } from './general/components/dashboard-operation-sighting-add-form-container/dashboard-operation-sighting-add-form-container.component';
import { DashboardOperationSightingAddFormPresentationalComponent } from './general/components/dashboard-operation-sighting-add-form-presentational/dashboard-operation-sighting-add-form-presentational.component';
import { MatInputModule } from '@angular/material/input';
import { DashboardTripAddFormContainerComponent } from './general/components/dashboard-trip-add-form-container/dashboard-trip-add-form-container.component';
import { DashboardTripAddFormPresentationalComponent } from './general/components/dashboard-trip-add-form-presentational/dashboard-trip-add-form-presentational.component';
import { DashboardResolverService } from './general/services/dashboard-resolver.service';

@NgModule({
  declarations: [
    DashboardComponent,
    DashboardTimetableSearchFormContainerComponent,
    DashboardTimetableSearchFormPresentationalComponent,
    DashboardOperationSearchMenuContainerComponent,
    DashboardOperationSearchMenuPresentationalComponent,
    DashboardOperationSightingAddFormContainerComponent,
    DashboardOperationSightingAddFormPresentationalComponent,
    DashboardTripAddFormContainerComponent,
    DashboardTripAddFormPresentationalComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatButtonModule,
    MatListModule,
    MatInputModule,
    DashboardRoutingModule
  ],
  providers: [DashboardResolverService]
})
export class DashboardModule {}
