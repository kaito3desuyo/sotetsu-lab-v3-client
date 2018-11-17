import { NgModule } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';

@NgModule({
  imports: [AngularMaterialModule],
  exports: [HeaderComponent],
  declarations: [HeaderComponent]
})
export class HeaderModule {}
