import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { TimetableAddHeaderCComponent } from './components/timetable-add-header-c/timetable-add-header-c.component';
import { TimetableAddMainCComponent } from './components/timetable-add-main-c/timetable-add-main-c.component';

@Component({
    selector: 'app-timetable-add',
    templateUrl: './timetable-add.component.html',
    styleUrls: ['./timetable-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableAddHeaderCComponent, TimetableAddMainCComponent],
    providers: [RxState]
})
export class TimetableAddComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });
    }
}
