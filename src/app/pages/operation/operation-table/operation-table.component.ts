import { Component, OnInit, Inject, Injector } from '@angular/core';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TitleService } from 'src/app/general/services/title.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { RequestQueryBuilder } from '@nestjsx/crud-request';

@Component({
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
})
export class OperationTableComponent extends BaseComponent {
    calendarId: string;

    constructor(
        @Inject(Injector) injector: Injector,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private readonly operationService: OperationService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle(data.title);
            }
        );
        this.subscription = this.route.paramMap.subscribe((params) => {
            this.calendarId = params.get('calendar_id');
        });

        this.operationService
            .findOneWithTrips(
                'f653fee4-6ecb-470d-96d7-36880c815047',
                new RequestQueryBuilder()
            )
            .subscribe(console.log);
    }
}
