import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { TimetableUpdateHeaderCComponent } from './components/timetable-update-header-c/timetable-update-header-c.component';
import { TimetableUpdateMainCComponent } from './components/timetable-update-main-c/timetable-update-main-c.component';

@Component({
    selector: 'app-timetable-update',
    templateUrl: './timetable-update.component.html',
    styleUrls: ['./timetable-update.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableUpdateHeaderCComponent, TimetableUpdateMainCComponent],
    providers: [RxState]
})
export class TimetableUpdateComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });
    }
}
