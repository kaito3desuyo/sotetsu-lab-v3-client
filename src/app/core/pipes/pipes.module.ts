import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayjsPipe } from './dayjs.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { FindByIdPipe } from './find-by-id.pipe';
import { TrackByPipe } from './track-by.pipe';

@NgModule({
    declarations: [
        DayjsPipe,
        OperationNumberColorPipe,
        FindByIdPipe,
        TrackByPipe,
    ],
    imports: [CommonModule],
    exports: [DayjsPipe, OperationNumberColorPipe, FindByIdPipe, TrackByPipe],
})
export class PipesModule {}
