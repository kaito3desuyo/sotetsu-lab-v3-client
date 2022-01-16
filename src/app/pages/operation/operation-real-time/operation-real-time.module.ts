import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationPostCardModule } from 'src/app/shared/operation-post-card/operation-post-card.module';
import { OperationSharedModule } from 'src/app/shared/operation-shared/operation-shared.module';
import { OperationRealTimeControlPanelPComponent } from './components/operation-real-time-control-panel-p/operation-real-time-control-panel-p.component';
import { OperationRealTimeHeaderCComponent } from './components/operation-real-time-header-c/operation-real-time-header-c.component';
import { OperationRealTimeHeaderPComponent } from './components/operation-real-time-header-p/operation-real-time-header-p.component';
import { OperationRealTimeLegendPComponent } from './components/operation-real-time-legend-p/operation-real-time-legend-p.component';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';
import { OperationRealTimeTablePComponent } from './components/operation-real-time-table-p/operation-real-time-table-p.component';
import { OperationSightingsControlPanelContainerComponent } from './general/components/operation-sightings-control-panel-container/operation-sightings-control-panel-container.component';
import { OperationSightingsControlPanelPresentationalComponent } from './general/components/operation-sightings-control-panel-presentational/operation-sightings-control-panel-presentational.component';
import { OperationSightingsTableByFormationContainerComponent } from './general/components/operation-sightings-table-by-formation-container/operation-sightings-table-by-formation-container.component';
import { OperationSightingsTableByOperationContainerComponent } from './general/components/operation-sightings-table-by-operation-container/operation-sightings-table-by-operation-container.component';
import { OperationSightingsTableLegendContainerComponent } from './general/components/operation-sightings-table-legend-container/operation-sightings-table-legend-container.component';
import { OperationSightingsTableLegendPresentationalComponent } from './general/components/operation-sightings-table-legend-presentational/operation-sightings-table-legend-presentational.component';
import { OperationSightingsTablePresentationalComponent } from './general/components/operation-sightings-table-presentational/operation-sightings-table-presentational.component';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { OperationRealTimeService } from './general/services/operation-real-time.service';
import { OperationRealTimeRoutingModule } from './operation-real-time-routing.module';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { OperationRealTimeFormationNumberStylePipe } from './pipes/operation-real-time-formation-number-style.pipe';
import { OperationRealTimeTimeColorPipe } from './pipes/operation-real-time-time-color.pipe';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from './states/operation-real-time.state';

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
        OperationRealTimeLegendPComponent,
        OperationRealTimeHeaderCComponent,
        OperationRealTimeControlPanelPComponent,
        OperationRealTimeHeaderPComponent,
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
        OperationPostCardModule,
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
