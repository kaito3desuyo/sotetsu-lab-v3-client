import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { TimetableCopyHeaderCComponent } from './components/timetable-copy-header-c/timetable-copy-header-c.component';
import { TimetableCopyMainCComponent } from './components/timetable-copy-main-c/timetable-copy-main-c.component';

@Component({
    templateUrl: './timetable-copy.component.html',
    styleUrls: ['./timetable-copy.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableCopyHeaderCComponent, TimetableCopyMainCComponent],
    providers: [RxState]
})
export class TimetableCopyComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });
    }
}
