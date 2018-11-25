import { NgModule } from '@angular/core';
import { MyDatePipe } from 'src/app/pipes/my-date.pipe';

@NgModule({
  imports: [],
  declarations: [MyDatePipe],
  exports: [MyDatePipe]
})
export class PipesModule {
  static forRoot() {
    return {
      ngModule: PipesModule,
      providers: []
    };
  }
}
