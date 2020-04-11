import {
    Component,
    OnInit,
    Input,
    Inject,
    Injector,
    Output,
    EventEmitter,
} from '@angular/core';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
import moment from 'moment';
import { OperationSightingAddFormService } from '../../services/operation-sighting-add-form.service';
import { IOperationSightingAddForm } from 'src/app/shared/operation-shared/interfaces/operation-sighting-add-form';
import { Observable } from 'rxjs';
import { IAgency } from 'src/app/general/interfaces/agency';

@Component({
    selector: 'app-operation-sighting-add-form-container',
    templateUrl: './operation-sighting-add-form-container.component.html',
    styleUrls: ['./operation-sighting-add-form-container.component.scss'],
})
export class OperationSightingAddFormContainerComponent extends BaseComponent
    implements OnInit {
    agencies$: Observable<IAgency[]>;

    @Input() date: string;
    @Output() submitSighting: EventEmitter<any> = new EventEmitter<any>();

    constructor(
        @Inject(Injector) injector: Injector,
        private operationSightingAddFormService: OperationSightingAddFormService
    ) {
        super(injector);
        this.operationSightingAddFormService.fetchAgencies().subscribe();
        this.agencies$ = this.operationSightingAddFormService.getAgencies();
    }

    ngOnInit() {}

    onReceiveSubmitSighting(sighting: IOperationSightingAddForm): void {
        this.operationSightingAddFormService.addOperationSighting(sighting);
    }
}
