import { NgModule } from '@angular/core';
import { OperationRoutingModule } from './operation-routing.module';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReactiveFormsModule } from '@angular/forms';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OperationPastTimeComponent } from './operation-past-time/operation-past-time.component';
import { OperationPastTimeService } from './general/services/operation-past-time.service';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OperationSightingsTableByDateContainerComponent } from './general/components/operation-sightings-table-by-date-container/operation-sightings-table-by-date-container.component';
import { OperationSightingsTableByDatePresentationalComponent } from './general/components/operation-sightings-table-by-date-presentational/operation-sightings-table-by-date-presentational.component';
import { OperationSightingsSearchFormContainerComponent } from './general/components/operation-sightings-search-form-container/operation-sightings-search-form-container.component';
import { OperationSightingsSearchFormPresentationalComponent } from './general/components/operation-sightings-search-form-presentational/operation-sightings-search-form-presentational.component';

@NgModule({
    declarations: [
        OperationPastTimeComponent,
        OperationSightingsTableByDateContainerComponent,
        OperationSightingsTableByDatePresentationalComponent,
        OperationSightingsSearchFormContainerComponent,
        OperationSightingsSearchFormPresentationalComponent
    ],
    imports: [
        CommonModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        MatTableModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatRadioModule,
        MatSortModule,
        MatIconModule,
        MatToolbarModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        AppSharedModule,
        OperationRoutingModule,
        OperationSharedModule
    ],
    providers: [OperationPastTimeService, OperationPastTimeResolverService]
})
export class OperationModule {}
