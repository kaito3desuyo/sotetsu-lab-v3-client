import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AntiBracketsPipe } from './anti-brackets.pipe';
import { CalculateDayCountFromTodayPipe } from './calculate-day-count-from-today.pipe';
import { DayjsPipe } from './dayjs.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { MaxByPipe } from './max-by.pipe';
import { MinByPipe } from './min-by.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { RangePipe } from './range.pipe';
import { TrackByPipe } from './track-by.pipe';

@NgModule({
    declarations: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        RangePipe,
        AntiBracketsPipe,
    ],
    imports: [CommonModule],
    exports: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        RangePipe,
        AntiBracketsPipe,
    ],
})
export class PipesModule {}
