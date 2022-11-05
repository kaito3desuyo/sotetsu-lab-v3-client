import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationSearchCardModule } from 'src/app/shared/operation-search-card/operation-search-card.module';
import { OperationPastTimeHeaderCComponent } from './components/operation-past-time-header-c/operation-past-time-header-c.component';
import { OperationPastTimeHeaderPComponent } from './components/operation-past-time-header-p/operation-past-time-header-p.component';
import { OperationPastTimeMainCComponent } from './components/operation-past-time-main-c/operation-past-time-main-c.component';
import { OperationSightingsSearchFormPresentationalComponent } from './components/operation-sightings-search-form-presentational/operation-sightings-search-form-presentational.component';
import { OperationSightingsTableByDatePresentationalComponent } from './components/operation-sightings-table-by-date-presentational/operation-sightings-table-by-date-presentational.component';
import { OperationPastTimeResolverService } from './services/operation-past-time-resolver.service';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeRoutingModule } from './operation-past-time-routing.module';
import { OperationPastTimeComponent } from './operation-past-time.component';
import {
    OperationPastTimeStateQuery,
    OperationPastTimeStateStore,
} from './states/operation-past-time.state';
import { MatMomentDateModule } from '@angular/material-moment-adapter';

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
        MatMomentDateModule,
        MatButtonModule,
        PipesModule,
        OperationSearchCardModule,
    ],
    exports: [],
    declarations: [
        OperationPastTimeComponent,
        OperationSightingsTableByDatePresentationalComponent,
        OperationSightingsSearchFormPresentationalComponent,
        OperationPastTimeHeaderCComponent,
        OperationPastTimeMainCComponent,
        OperationPastTimeHeaderPComponent,
    ],
    providers: [
        OperationPastTimeService,
        OperationPastTimeResolverService,
        OperationPastTimeStateStore,
        OperationPastTimeStateQuery,
    ],
})
export class OperationPastTimeModule {}
