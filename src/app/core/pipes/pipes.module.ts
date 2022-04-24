import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayjsPipe } from './dayjs.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { TrackByPipe } from './track-by.pipe';
import { MaxByPipe } from './max-by.pipe';
import { MinByPipe } from './min-by.pipe';
import { CalculateDayCountFromTodayPipe } from './calculate-day-count-from-today.pipe';

@NgModule({
    declarations: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
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
    ],
})
export class PipesModule {}
