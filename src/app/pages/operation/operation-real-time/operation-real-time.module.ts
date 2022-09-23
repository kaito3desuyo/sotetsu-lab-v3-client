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
import { OperationRealTimeControlPanelPComponent } from './components/operation-real-time-control-panel-p/operation-real-time-control-panel-p.component';
import { OperationRealTimeHeaderCComponent } from './components/operation-real-time-header-c/operation-real-time-header-c.component';
import { OperationRealTimeHeaderPComponent } from './components/operation-real-time-header-p/operation-real-time-header-p.component';
import { OperationRealTimeLegendPComponent } from './components/operation-real-time-legend-p/operation-real-time-legend-p.component';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';
import { OperationRealTimeTablePComponent } from './components/operation-real-time-table-p/operation-real-time-table-p.component';
import { OperationRealTimeRoutingModule } from './operation-real-time-routing.module';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { OperationRealTimeFormationNumberStylePipe } from './pipes/operation-real-time-formation-number-style.pipe';
import { OperationRealTimeTimeColorPipe } from './pipes/operation-real-time-time-color.pipe';
import { OperationRealTimeResolverService } from './services/operation-real-time-resolver.service';
import { OperationRealTimeService } from './services/operation-real-time.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from './states/operation-real-time.state';

@NgModule({
    imports: [
        OperationRealTimeRoutingModule,
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
        AdsenseModule,
        PipesModule,
        OperationPostCardModule,
    ],
    declarations: [
        OperationRealTimeComponent,
        OperationRealTimeMainCComponent,
        OperationRealTimeTablePComponent,
        OperationRealTimeFormationNumberStylePipe,
        OperationRealTimeTimeColorPipe,
        OperationRealTimeLegendPComponent,
        OperationRealTimeHeaderCComponent,
        OperationRealTimeControlPanelPComponent,
        OperationRealTimeHeaderPComponent,
    ],
    providers: [
        OperationRealTimeService,
        OperationRealTimeResolverService,
        OperationRealTimeStateStore,
        OperationRealTimeStateQuery,
    ],
})
export class OperationRealTimeModule {}
