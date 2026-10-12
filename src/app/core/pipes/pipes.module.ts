import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AntiBracketsPipe } from './anti-brackets.pipe';
import { CalculateDayCountFromTodayPipe } from './calculate-day-count-from-today.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { MaxByPipe } from './max-by.pipe';
import { MinByPipe } from './min-by.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { PaddingPipe } from './padding.pipe';

@NgModule({
    imports: [
        CommonModule,
        OperationNumberColorPipe,
        FindByIdPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        AntiBracketsPipe,
        PaddingPipe,
    ],
    exports: [
        OperationNumberColorPipe,
        FindByIdPipe,
        MaxByPipe,
        MinByPipe,
        CalculateDayCountFromTodayPipe,
        AntiBracketsPipe,
        PaddingPipe,
    ],
})
export class PipesModule {}
