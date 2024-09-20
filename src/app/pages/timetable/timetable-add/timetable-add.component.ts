import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';

@Component({
    selector: 'app-timetable-add',
    templateUrl: './timetable-add.component.html',
    styleUrls: ['./timetable-add.component.scss'],
    providers: [RxState],
})
export class TimetableAddComponent {
    constructor(
        private readonly route: ActivatedRoute,
        private readonly state: RxState<{}>,
        private readonly titleService: TitleService,
    ) {
        this.state.hold(this.route.data, ({ title }) => {
            this.titleService.setTitle(title);
        });
    }
}
