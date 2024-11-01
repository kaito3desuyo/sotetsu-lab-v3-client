import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AntiBracketsPipe } from './anti-brackets.pipe';
import { CalculateDayCountFromTodayPipe } from './calculate-day-count-from-today.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { MaxByPipe } from './max-by.pipe';
import { MinByPipe } from './min-by.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { PaddingPipe } from './padding.pipe';
import { RangePipe } from './range.pipe';
import { TrackByPipe } from './track-by.pipe';

@NgModule({
    declarations: [
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        RangePipe,
        AntiBracketsPipe,
        PaddingPipe,
    ],
    imports: [CommonModule],
    exports: [
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        RangePipe,
        AntiBracketsPipe,
        PaddingPipe,
    ],
})
export class PipesModule {}
