import { Component, OnInit, Injector, Inject } from '@angular/core';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TitleService } from 'src/app/general/services/title.service';
import { TimetableSearchFormService } from 'src/app/shared/timetable-shared/services/timetable-search-form.service';

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrls: ['./timetable-all-line.component.scss'],
})
export class TimetableAllLineComponent extends BaseComponent {
    constructor(
        @Inject(Injector) injector: Injector,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private timetableSearchFormService: TimetableSearchFormService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle(data.title);
            }
        );

        this.subscription = this.route.paramMap.subscribe((params) => {
            const calendarId = params.get('calendar_id');
            const tripDirection = params.get('trip_direction');

            this.timetableSearchFormService.updateParams({
                calendarId,
                tripDirection: tripDirection as '0' | '1',
                isSearchStation: false,
                stationId: '',
            });
        });
    }
}
