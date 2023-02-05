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
import { TimetableEditFormModule } from 'src/app/shared/timetable-edit-form/timetable-edit-form.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableEditorFormContainerComponent } from './general/components/timetable-editor-form-container/timetable-editor-form-container.component';
import { TimetableEditorFormPresentationalComponent } from './general/components/timetable-editor-form-presentational/timetable-editor-form-presentational.component';
import { TimetableUpdateHeaderContainerComponent } from './general/components/timetable-update-header-container/timetable-update-header-container.component';
import { TimetableEditorService } from './general/services/timetable-editor.service';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';
import { TimetableUpdateService } from './general/services/timetable-update.service';
import { TimetableRoutingModule } from './timetable-routing.module';
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
        AdsenseModule,
        PipesModule,
        TimetableSearchCardModule,
        CalendarSelectDialogModule,
        TimetableEditFormModule,
    ],
    declarations: [
        TimetableUpdateComponent,
        TimetableUpdateHeaderContainerComponent,
        TimetableEditorFormContainerComponent,
        TimetableEditorFormPresentationalComponent,
    ],
    providers: [
        TimetableUpdateService,
        TimetableUpdateResolverService,
        TimetableEditorService,
    ],
})
export class TimetableModule {}
