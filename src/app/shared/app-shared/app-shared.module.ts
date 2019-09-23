import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaddingPipe } from './pipes/padding.pipe';

@NgModule({
  imports: [CommonModule],
  exports: [PaddingPipe],
  declarations: [PaddingPipe],
  providers: []
})
export class AppSharedModule {}
