import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSharedService } from './services/app-shared.service';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  providers: [AppSharedService]
})
export class AppSharedModule {}
