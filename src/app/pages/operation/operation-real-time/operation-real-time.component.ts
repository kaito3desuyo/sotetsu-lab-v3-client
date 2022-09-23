import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';

@Component({
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss'],
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
