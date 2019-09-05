import { Injectable } from '@angular/core';
import { OperationRealTimeService } from './operation-real-time.service';
import { Observable, of } from 'rxjs';
import { Resolve } from '@angular/router';
import { CurrentParamsService } from 'src/app/general/models/current-params/current-params.service';
import { flatMap } from 'rxjs/operators';
import moment from 'moment';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';

@Injectable()
export class OperationRealTimeFormationNumbersResolverService
  implements Resolve<Observable<void>> {
  constructor(private operationRealTimeService: OperationRealTimeService) {}

  resolve(): Observable<void> {
    return this.operationRealTimeService.fetchFormationNumbers();
  }
}

@Injectable()
export class OperationRealTimeOperationNumbersResolverService
  implements Resolve<Observable<void>> {
  constructor(
    private operationRealTimeService: OperationRealTimeService,
    private currentParamsQuery: CurrentParamsQuery,
    private currentParamsService: CurrentParamsService
  ) {}

  resolve(): Observable<void> {
    console.log(this.currentParamsQuery.getValue());
    const currentParams = this.currentParamsQuery.getValue();
    if (
      currentParams.calender.id &&
      currentParams.today === currentParams.calender.lastUpdatedAt
    ) {
      return this.operationRealTimeService.fetchOperationNumbers();
    }
    return this.currentParamsService
      .fetchSpecifiedDateCalenderId(
        moment()
          .subtract(moment().hour() < 4 ? 1 : 0)
          .format('YYYY-MM-DD')
      )
      .pipe(
        flatMap(() => {
          return this.operationRealTimeService.fetchOperationNumbers();
        })
      );
  }
}

@Injectable()
export class OperationRealTimeOperationsAllTripsResolverService
  implements Resolve<Observable<void>> {
  constructor(private operationRealTimeService: OperationRealTimeService) {}

  resolve(): Observable<void> {
    return this.operationRealTimeService.fetchOperationTrips();
  }
}

@Injectable()
export class OperationRealTimeTripsResolverService
  implements Resolve<Observable<void>> {
  constructor(
    private operationRealTimeService: OperationRealTimeService,
    private currentParamsQuery: CurrentParamsQuery,
    private currentParamsService: CurrentParamsService
  ) {}

  resolve(): Observable<void> {
    const currentParams = this.currentParamsQuery.getValue();
    if (
      currentParams.calender.id &&
      currentParams.today === currentParams.calender.lastUpdatedAt
    ) {
      return this.operationRealTimeService.fetchTrips();
    }
    return this.currentParamsService
      .fetchSpecifiedDateCalenderId(
        moment()
          .subtract(moment().hour() < 4 ? 1 : 0)
          .format('YYYY-MM-DD')
      )
      .pipe(
        flatMap(() => {
          return this.operationRealTimeService.fetchTrips();
        })
      );
  }
}
