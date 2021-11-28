import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayjsPipe } from './dayjs.pipe';

@NgModule({
    declarations: [DayjsPipe],
    imports: [CommonModule],
    exports: [DayjsPipe],
})
export class PipesModule {}
