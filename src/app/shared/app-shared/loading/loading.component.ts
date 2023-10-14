import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RxPush } from '@rx-angular/template/push';

@Component({
    standalone: true,
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.component.scss'],
    imports: [RxPush, MatProgressSpinnerModule],
})
export class LoadingComponent {}
