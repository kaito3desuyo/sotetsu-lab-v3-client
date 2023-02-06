import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading.component';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { LoadingService } from './loading.service';

@NgModule({
    imports: [CommonModule, MatProgressSpinnerModule, MatProgressBarModule],
    declarations: [LoadingComponent],
    providers: [LoadingService]
})
export class LoadingModule {}
