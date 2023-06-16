import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationRealTimeHeaderCComponent } from './components/operation-real-time-header-c/operation-real-time-header-c.component';
import { OperationRealTimeMainCComponent } from './components/operation-real-time-main-c/operation-real-time-main-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss'],
    imports: [
        CommonModule,
        OperationRealTimeHeaderCComponent,
        OperationRealTimeMainCComponent,
    ],
    providers: [RxState],
})
export class OperationRealTimeComponent {
    constructor(
        private readonly route: ActivatedRoute,
        private readonly state: RxState<{}>,
        private readonly titleService: TitleService
    ) {
        this.state.hold(this.route.data, (data: { title: string }) => {
            this.titleService.setTitle(data.title);
        });
    }
}
