import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationPastTimeService } from './general/services/operation-past-time.service';
import { ReactiveFormsModule } from '@angular/forms';
import { OperationSightingsTableByDatePresentationalComponent } from './general/components/operation-sightings-table-by-date-presentational/operation-sightings-table-by-date-presentational.component';
import { OperationSightingsSearchFormPresentationalComponent } from './general/components/operation-sightings-search-form-presentational/operation-sightings-search-form-presentational.component';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';
import { OperationPastTimeComponent } from './operation-past-time.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingsSearchFormContainerComponent } from './general/components/operation-sightings-search-form-container/operation-sightings-search-form-container.component';
import { OperationSightingsTableByDateContainerComponent } from './general/components/operation-sightings-table-by-date-container/operation-sightings-table-by-date-container.component';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { OperationPastTimeRoutingModule } from './operation-past-time-routing.module';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
    imports: [
        CommonModule,
        OperationPastTimeRoutingModule,
        RouterModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatDatepickerModule,
        MatButtonModule,
    ],
    exports: [],
    declarations: [
        OperationPastTimeComponent,
        OperationSightingsTableByDateContainerComponent,
        OperationSightingsTableByDatePresentationalComponent,
        OperationSightingsSearchFormContainerComponent,
        OperationSightingsSearchFormPresentationalComponent,
    ],
    providers: [OperationPastTimeService, OperationPastTimeResolverService],
})
export class OperationPastTimeModule {}
