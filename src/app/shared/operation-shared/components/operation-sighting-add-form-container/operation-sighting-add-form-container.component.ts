import {
  Component,
  OnInit,
  Input,
  Inject,
  Injector,
  Output,
  EventEmitter
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
  styleUrls: ['./operation-sighting-add-form-container.component.scss']
})
export class OperationSightingAddFormContainerComponent extends BaseComponent
  implements OnInit {
  agencies$: Observable<IAgency[]>;

  @Input() date: string;
  @Output() submitSighting: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    @Inject(Injector) injector: Injector,
    private operationSightingAddFormService: OperationSightingAddFormService,
    private currentParamsQuery: CurrentParamsQuery
  ) {
    super(injector);
    this.operationSightingAddFormService.fetchAgencies().subscribe();
    this.agencies$ = this.operationSightingAddFormService.getAgencies();
  }

  ngOnInit() {}

  async onReceiveSubmitSighting(
    sighting: IOperationSightingAddForm
  ): Promise<void> {
    try {
      const targetFormation = await this.operationSightingAddFormService.getCurrentFormationByVehicleNumber(
        sighting.agencyId,
        sighting.vehicleNumber,
        this.date
      );

      if (!targetFormation || !targetFormation.length) {
        throw new Error('存在しない車両番号です');
      }

      const currentParams = this.currentParamsQuery.getValue();

      const targetOperation = await this.operationSightingAddFormService.getOperationByCalendarIdAndOperationNumber(
        currentParams.calendar.id,
        sighting.operationNumber
      );

      if (!targetOperation || !targetOperation.length) {
        throw new Error('存在しない運用番号です');
      }

      let sightingTime = moment();
      if (sighting.sightingTime) {
        if (moment().hour() < 4) {
          sightingTime = moment(sighting.sightingTime, 'HH:mm').subtract(
            moment(sighting.sightingTime, 'HH:mm').hour() >= 4 ? 1 : 0
          );
        } else {
          sightingTime = moment(sighting.sightingTime, 'HH:mm').add(
            moment(sighting.sightingTime, 'HH:mm').hour() < 4 ? 1 : 0
          );
        }
        if (moment() < sightingTime) {
          throw new Error('未来の時刻を選択することはできません');
        }
      }

      const addResult = await this.operationSightingAddFormService.addOperationSighting(
        targetFormation[0].id,
        targetOperation[0].id,
        moment().toISOString()
      );

      this.notification.open('目撃情報を送信しました', 'OK');
      this.submitSighting.emit(addResult);
    } catch (e) {
      this.notification.open(e.message, 'OK');
    }
  }
}
