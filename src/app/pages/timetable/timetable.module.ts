import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableRoutingModule } from './timetable-routing.module';
import { TimetableAllLineComponent } from './timetable-all-line/timetable-all-line.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { TimetableAllLineTableContainerComponent } from './general/components/timetable-all-line-table-container/timetable-all-line-table-container.component';
import { TimetableAllLineTablePresentationalComponent } from './general/components/timetable-all-line-table-presentational/timetable-all-line-table-presentational.component';
import { TimetableAllLineService } from './general/services/timetable-all-line.service';
import { TimetableAllLineTableResolverService } from './general/services/timetable-all-line-table-resolver.service';
import { TimetableAllLinePaginatorContainerComponent } from './general/components/timetable-all-line-paginator-container/timetable-all-line-paginator-container.component';
import { TimetableAllLinePaginatorPresentationalComponent } from './general/components/timetable-all-line-paginator-presentational/timetable-all-line-paginator-presentational.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TimetableAllLineHeaderContainerComponent } from './general/components/timetable-all-line-header-container/timetable-all-line-header-container.component';
import { TimetableAllLineHeaderPresentationalComponent } from './general/components/timetable-all-line-header-presentational/timetable-all-line-header-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TimetableAddComponent } from './timetable-add/timetable-add.component';
import { TimetableAddHeaderContainerComponent } from './general/components/timetable-add-header-container/timetable-add-header-container.component';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { TimetableAddService } from './general/services/timetable-add.service';
import { TimetableAddResolverService } from './general/services/timetable-add-resolver.service';
import { TimetableEditorFormContainerComponent } from './general/components/timetable-editor-form-container/timetable-editor-form-container.component';
import { TimetableEditorFormPresentationalComponent } from './general/components/timetable-editor-form-presentational/timetable-editor-form-presentational.component';
import { TimetableEditorService } from './general/services/timetable-editor.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimetableAddModeSelectContainerComponent } from './general/components/timetable-add-mode-select-container/timetable-add-mode-select-container.component';
import { TimetableAddModeSelectPresentationalComponent } from './general/components/timetable-add-mode-select-presentational/timetable-add-mode-select-presentational.component';
import { TimetableUpdateComponent } from './timetable-update/timetable-update.component';
import { TimetableUpdateHeaderContainerComponent } from './general/components/timetable-update-header-container/timetable-update-header-container.component';
import { TimetableUpdateService } from './general/services/timetable-update.service';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';
import { MatDialogModule } from '@angular/material/dialog';
import { TimetableStationComponent } from './timetable-station/timetable-station.component';
import { TimetableStationHeaderContainerComponent } from './general/components/timetable-station-header-container/timetable-station-header-container.component';
import { TimetableStationHeaderPresentationalComponent } from './general/components/timetable-station-header-presentational/timetable-station-header-presentational.component';
import { TimetableStationService } from './general/services/timetable-station.service';
import { TimetableStationResolverService } from './general/services/timetable-station-resolver.service';
import { TimetableStationTableContainerComponent } from './general/components/timetable-station-table-container/timetable-station-table-container.component';
import { TimetableStationTablePresentationalComponent } from './general/components/timetable-station-table-presentational/timetable-station-table-presentational.component';
import { TimetableSharedModule } from 'src/app/shared/timetable-shared/timetable-shared.module';
import { AdsenseModule } from 'ng2-adsense';

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
    ],
    declarations: [
        TimetableAllLineComponent,
        TimetableStationComponent,
        TimetableAddComponent,
        TimetableUpdateComponent,
        TimetableAllLineHeaderContainerComponent,
        TimetableAllLineHeaderPresentationalComponent,
        TimetableAllLineTableContainerComponent,
        TimetableAllLineTablePresentationalComponent,
        TimetableAllLinePaginatorContainerComponent,
        TimetableAllLinePaginatorPresentationalComponent,
        TimetableStationHeaderContainerComponent,
        TimetableStationHeaderPresentationalComponent,
        TimetableStationTableContainerComponent,
        TimetableStationTablePresentationalComponent,
        TimetableAddHeaderContainerComponent,
        TimetableAddModeSelectContainerComponent,
        TimetableAddModeSelectPresentationalComponent,
        TimetableUpdateHeaderContainerComponent,
        TimetableEditorFormContainerComponent,
        TimetableEditorFormPresentationalComponent,
    ],
    providers: [
        TimetableAllLineService,
        TimetableAllLineTableResolverService,
        TimetableStationService,
        TimetableStationResolverService,
        TimetableAddService,
        TimetableAddResolverService,
        TimetableUpdateService,
        TimetableUpdateResolverService,
        TimetableEditorService,
    ],
})
export class TimetableModule {}
