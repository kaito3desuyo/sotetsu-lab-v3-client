import { Component, OnInit, Input, Inject, Injector } from '@angular/core';
import { IOperationSightingAddForm } from '../../interfaces/operation-sighting-add-form';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
import moment from 'moment';

@Component({
  selector: 'app-operation-sighting-add-form-container',
  templateUrl: './operation-sighting-add-form-container.component.html',
  styleUrls: ['./operation-sighting-add-form-container.component.scss']
})
export class OperationSightingAddFormContainerComponent extends BaseComponent
  implements OnInit {
  @Input() date: string;

  constructor(
    @Inject(Injector) injector: Injector,
    private operationRealTimeService: OperationRealTimeService,
    private currentParamsQuery: CurrentParamsQuery
  ) {
    super(injector);
  }

  ngOnInit() {}

  async onReceiveSubmitSighting(
    sighting: IOperationSightingAddForm
  ): Promise<void> {
    const targetFormation = await this.operationRealTimeService.getCurrentFormationByVehicleNumber(
      null,
      sighting.vehicleNumber,
      this.date
    );

    if (!targetFormation || !targetFormation.length) {
      this.notification.open('存在しない車両番号です', 'OK');
      return;
    }

    const currentParams = this.currentParamsQuery.getValue();
    console.log(currentParams);

    const targetOperation = await this.operationRealTimeService.getOperationByCalenderIdAndOperationNumber(
      currentParams.calenderId,
      sighting.operationNumber
    );

    if (!targetOperation || !targetOperation.length) {
      this.notification.open('存在しない運用番号です', 'OK');
      return;
    }

    console.log(targetOperation);

    const addResult = await this.operationRealTimeService.addOperationSighting(
      targetFormation[0].id,
      targetOperation[0].id,
      moment().format()
    );

    console.log(addResult);
  }
}
