import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { TimetablePostCardCComponent } from './components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetablePostCardPComponent } from './components/timetable-post-card-p/timetable-post-card-p.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { TimetablePostCardService } from './services/timetable-post-card.service';

@NgModule({
    declarations: [TimetablePostCardCComponent, TimetablePostCardPComponent],
    providers: [TimetablePostCardService],
    exports: [TimetablePostCardCComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatCardModule,
        MatSelectModule,
        MatButtonModule,
        MatRadioModule,
        PipesModule,
    ],
})
export class TimetablePostCardModule {}
