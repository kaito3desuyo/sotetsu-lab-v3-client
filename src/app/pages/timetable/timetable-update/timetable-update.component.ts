import { Component, OnInit, Injector, Inject } from '@angular/core';
import { TitleService } from 'src/app/core/services/title.service';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { TimetableUpdateService } from '../general/services/timetable-update.service';

@Component({
    selector: 'app-timetable-update',
    templateUrl: './timetable-update.component.html',
    styleUrls: ['./timetable-update.component.scss'],
})
export class TimetableUpdateComponent extends BaseComponent {
    constructor(
        @Inject(Injector) injector: Injector,
        private titleService: TitleService,
        private route: ActivatedRoute,
        private timetableUpdateService: TimetableUpdateService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle(data.title);
            }
        );
        this.subscription = this.timetableUpdateService.receiveSaveEvent();
    }
}
