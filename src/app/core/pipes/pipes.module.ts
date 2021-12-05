import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayjsPipe } from './dayjs.pipe';
import { OperationNumberColorPipe } from './operation-number-color.pipe';
import { FindByIdPipe } from './find-by-id.pipe';

@NgModule({
    declarations: [DayjsPipe, OperationNumberColorPipe, FindByIdPipe],
    imports: [CommonModule],
    exports: [DayjsPipe, OperationNumberColorPipe, FindByIdPipe],
})
export class PipesModule {}
