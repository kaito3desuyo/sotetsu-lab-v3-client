import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { CalendarSelectDialogModule } from 'src/app/shared/calendar-select-dialog/calendar-select-dialog.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableSharedModule } from 'src/app/shared/timetable-shared/timetable-shared.module';
import { TimetableAddHeaderContainerComponent } from './general/components/timetable-add-header-container/timetable-add-header-container.component';
import { TimetableAddModeSelectContainerComponent } from './general/components/timetable-add-mode-select-container/timetable-add-mode-select-container.component';
import { TimetableAddModeSelectPresentationalComponent } from './general/components/timetable-add-mode-select-presentational/timetable-add-mode-select-presentational.component';
import { TimetableCopyHeaderContainerComponent } from './general/components/timetable-copy-header-container/timetable-copy-header-container.component';
import { TimetableEditorFormContainerComponent } from './general/components/timetable-editor-form-container/timetable-editor-form-container.component';
import { TimetableEditorFormPresentationalComponent } from './general/components/timetable-editor-form-presentational/timetable-editor-form-presentational.component';
import { TimetableUpdateHeaderContainerComponent } from './general/components/timetable-update-header-container/timetable-update-header-container.component';
import { TimetableAddResolverService } from './general/services/timetable-add-resolver.service';
import { TimetableAddService } from './general/services/timetable-add.service';
import { TimetableCopyResolverService } from './general/services/timetable-copy-resolver.service';
import { TimetableCopyService } from './general/services/timetable-copy.service';
import { TimetableEditorService } from './general/services/timetable-editor.service';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';
import { TimetableUpdateService } from './general/services/timetable-update.service';
import { TimetableAddComponent } from './timetable-add/timetable-add.component';
import { TimetableCopyComponent } from './timetable-copy/timetable-copy.component';
import { TimetableRoutingModule } from './timetable-routing.module';
import { TimetableStationHeaderCComponent } from './timetable-station/components/timetable-station-header-c/timetable-station-header-c.component';
import { TimetableStationHeaderPComponent } from './timetable-station/components/timetable-station-header-p/timetable-station-header-p.component';
import { TimetableStationMainCComponent } from './timetable-station/components/timetable-station-main-c/timetable-station-main-c.component';
import { TimetableStationTablePComponent } from './timetable-station/components/timetable-station-table-p/timetable-station-table-p.component';
import { TimetableStationFindLastStopStationPipe } from './timetable-station/pipes/timetable-station-find-last-stop-station.pipe';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from './timetable-station/pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';
import { TimetableStationResolverService } from './timetable-station/services/timetable-station-resolver.service';
import { TimetableStationService } from './timetable-station/services/timetable-station.service';
import {
    TimetableStationStateQuery,
    TimetableStationStateStore,
} from './timetable-station/states/timetable-station.state';
import { TimetableStationComponent } from './timetable-station/timetable-station.component';
import { TimetableUpdateComponent } from './timetable-update/timetable-update.component';

@NgModule({
    imports: [
        CommonModule,
        FlexLayoutModule,
        FormsModule,
        ReactiveFormsModule,
        TimetableRoutingModule,
        AppSharedModule,
        FlexLayoutModule,
        MatCardModule,
        MatPaginatorModule,
        MatToolbarModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatDialogModule,
        TimetableSharedModule,
        AdsenseModule,
        PipesModule,
        TimetableSearchCardModule,
        CalendarSelectDialogModule,
    ],
    declarations: [
        TimetableStationComponent,
        TimetableAddComponent,
        TimetableUpdateComponent,
        TimetableAddHeaderContainerComponent,
        TimetableAddModeSelectContainerComponent,
        TimetableAddModeSelectPresentationalComponent,
        TimetableUpdateHeaderContainerComponent,
        TimetableEditorFormContainerComponent,
        TimetableEditorFormPresentationalComponent,
        TimetableCopyComponent,
        TimetableCopyHeaderContainerComponent,
        TimetableStationHeaderCComponent,
        TimetableStationMainCComponent,
        TimetableStationTablePComponent,
        TimetableStationFindLastStopStationPipe,
        TimetableStationFindOtherTripsInSameTripBlockPipe,
        TimetableStationHeaderPComponent,
    ],
    providers: [
        TimetableStationService,
        TimetableStationResolverService,
        TimetableStationStateStore,
        TimetableStationStateQuery,
        TimetableAddService,
        TimetableAddResolverService,
        TimetableUpdateService,
        TimetableUpdateResolverService,
        TimetableEditorService,
        TimetableCopyService,
        TimetableCopyResolverService,
    ],
})
export class TimetableModule {}
