import { Component, Inject, Injector, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { TitleService } from 'src/app/general/services/title.service';
import { TimetableCopyService } from '../general/services/timetable-copy.service';

@Component({
    templateUrl: './timetable-copy.component.html',
    styleUrls: ['./timetable-copy.component.scss'],
})
export class TimetableCopyComponent extends BaseComponent {
    constructor(
        @Inject(Injector) injector: Injector,
        private titleService: TitleService,
        private route: ActivatedRoute,
        private timetableCopyService: TimetableCopyService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle(data.title);
            }
        );
        this.subscription = this.timetableCopyService.receiveSaveEvent();
    }
}
