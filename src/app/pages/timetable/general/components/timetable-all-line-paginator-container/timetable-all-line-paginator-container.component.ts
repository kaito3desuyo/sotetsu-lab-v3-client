import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';

@Component({
    selector: 'app-timetable-all-line-paginator-container',
    templateUrl: './timetable-all-line-paginator-container.component.html',
    styleUrls: ['./timetable-all-line-paginator-container.component.scss']
})
export class TimetableAllLinePaginatorContainerComponent {
    pageSetting$: Observable<PageEvent>;

    constructor(private timetableAllLineService: TimetableAllLineService) {
        this.pageSetting$ = this.timetableAllLineService.getPageSetting();
    }

    onReceivePaging(event: PageEvent): void {
        this.timetableAllLineService.setPageSetting(event);
    }
}
