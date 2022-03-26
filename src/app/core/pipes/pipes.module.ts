import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayjsPipe } from './dayjs.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { TrackByPipe } from './track-by.pipe';
import { MaxByPipe } from './max-by.pipe';
import { MinByPipe } from './min-by.pipe';

@NgModule({
    declarations: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
    ],
    imports: [CommonModule],
    exports: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
        MaxByPipe,
        MinByPipe,
    ],
})
export class PipesModule {}
