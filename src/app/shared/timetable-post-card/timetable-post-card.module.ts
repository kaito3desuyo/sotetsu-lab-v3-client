import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
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
