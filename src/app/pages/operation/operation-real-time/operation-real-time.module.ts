import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationRealTimeRoutingModule } from './operation-real-time-routing.module';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationSightingsTableByOperationContainerComponent } from './general/components/operation-sightings-table-by-operation-container/operation-sightings-table-by-operation-container.component';
import { OperationSightingsTableByFormationContainerComponent } from './general/components/operation-sightings-table-by-formation-container/operation-sightings-table-by-formation-container.component';
import { OperationSightingsTablePresentationalComponent } from './general/components/operation-sightings-table-presentational/operation-sightings-table-presentational.component';
import { OperationSightingsTableLegendContainerComponent } from './general/components/operation-sightings-table-legend-container/operation-sightings-table-legend-container.component';
import { OperationSightingsTableLegendPresentationalComponent } from './general/components/operation-sightings-table-legend-presentational/operation-sightings-table-legend-presentational.component';
import { OperationSightingsControlPanelContainerComponent } from './general/components/operation-sightings-control-panel-container/operation-sightings-control-panel-container.component';
import { OperationSightingsControlPanelPresentationalComponent } from './general/components/operation-sightings-control-panel-presentational/operation-sightings-control-panel-presentational.component';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { OperationRealTimeService } from './general/services/operation-real-time.service';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSortModule } from '@angular/material/sort';
import { AdsenseModule } from 'ng2-adsense';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from './states/operation-real-time.state';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';
import { OperationRealTimeTablePComponent } from './components/operation-real-time-table-p/operation-real-time-table-p.component';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationRealTimeFormationNumberStylePipe } from './pipes/operation-real-time-formation-number-style.pipe';
import { OperationRealTimeTimeColorPipe } from './pipes/operation-real-time-time-color.pipe';

@NgModule({
    declarations: [
        OperationRealTimeComponent,
        OperationSightingsTableByOperationContainerComponent,
        OperationSightingsTableByFormationContainerComponent,
        OperationSightingsTablePresentationalComponent,
        OperationSightingsTableLegendContainerComponent,
        OperationSightingsTableLegendPresentationalComponent,
        OperationSightingsControlPanelContainerComponent,
        OperationSightingsControlPanelPresentationalComponent,
        OperationRealTimeMainCComponent,
        OperationRealTimeTablePComponent,
        OperationRealTimeFormationNumberStylePipe,
        OperationRealTimeTimeColorPipe,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatSlideToggleModule,
        MatCardModule,
        MatTableModule,
        MatIconModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatSortModule,
        OperationRealTimeRoutingModule,
        OperationSharedModule,
        AdsenseModule,
        PipesModule,
    ],
    exports: [],
    providers: [
        OperationRealTimeService,
        OperationRealTimeResolverService,
        OperationRealTimeStateStore,
        OperationRealTimeStateQuery,
    ],
})
export class OperationRealTimeModule {}
