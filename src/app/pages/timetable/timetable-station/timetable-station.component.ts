import { Component, OnInit, Inject, Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TimetableSearchFormService } from 'src/app/shared/timetable-shared/services/timetable-search-form.service';
import { TitleService } from 'src/app/general/services/title.service';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
    selector: 'app-timetable-station',
    templateUrl: './timetable-station.component.html',
    styleUrls: ['./timetable-station.component.scss'],
})
export class TimetableStationComponent extends BaseComponent {
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
            const calendarId = params.get('calendarId');
            const tripDirection = params.get('trip_direction');
            const stationId = params.get('stationId');

            this.timetableSearchFormService.updateParams({
                calendarId,
                tripDirection: tripDirection as '0' | '1',
                isSearchStation: true,
                stationId,
            });
        });
    }
}
