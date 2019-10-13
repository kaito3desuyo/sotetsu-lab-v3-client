import { NgModule } from '@angular/core';
import { MyDatePipe } from 'src/app/pipes/my-date.pipe';
import { RangePipe } from 'src/app/pipes/range.pipe';

@NgModule({
  imports: [],
  declarations: [MyDatePipe, RangePipe],
  exports: [MyDatePipe, RangePipe]
})
export class PipesModule {
  static forRoot() {
    return {
      ngModule: PipesModule,
      providers: []
    };
  }
}
