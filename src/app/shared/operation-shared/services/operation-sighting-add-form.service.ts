import { Injectable } from '@angular/core';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { AgencyApiService } from 'src/app/general/api/agency-api.service';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IAgency } from 'src/app/general/interfaces/agency';
import { tap, map } from 'rxjs/operators';
import { AgencyModel } from 'src/app/general/models/agency/agency-model';
import { FormationModel } from 'src/app/general/models/formation/formation-model';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { IOperationSightingAddForm } from '../interfaces/operation-sighting-add-form';
import { BaseService } from 'src/app/general/classes/base-service';
import { ParamsQuery } from 'src/app/state/params';
import moment from 'moment';
import { NotificationService } from 'src/app/general/services/notification.service';
import { SocketService } from 'src/app/general/services/socket.service';

@Injectable()
export class OperationSightingAddFormService extends BaseService {
    private agencies$: BehaviorSubject<IAgency[]> = new BehaviorSubject<
        IAgency[]
    >([]);
    private date = moment()
        .subtract(moment().hour() < 4 ? 1 : 0)
        .format('YYYY-MM-DD');

    private _sendSightingEvent$: Subject<void> = new Subject<void>();
    sendSightingEvent$: Observable<
        void
    > = this._sendSightingEvent$.asObservable();

    constructor(
        private socketService: SocketService,
        private agencyApi: AgencyApiService,
        private formationApi: FormationApiService,
        private operationApi: OperationApiService,
        private paramsQuery: ParamsQuery,
        private notification: NotificationService
    ) {
        super();
    }

    getAgencies(): Observable<IAgency[]> {
        return this.agencies$.asObservable();
    }

    setAgencies(array: IAgency[]): void {
        this.agencies$.next(array);
    }

    fetchAgencies(): Observable<void> {
        return this.agencyApi.getAgencies().pipe(
            tap((data) => {
                const agencies = data.agencies.map((result) =>
                    AgencyModel.readAgencyDtoImpl(result)
                );
                this.setAgencies(agencies);
            }),
            map(() => null)
        );
    }

    async addOperationSighting(
        sighting: IOperationSightingAddForm
    ): Promise<void> {
        try {
            let targetFormationId = '';

            const formationSearchResult = await this.formationApi
                .searchFormations({
                    agency_id: sighting.agencyId,
                    formation_number: sighting.formationOrVehicleNumber,
                    date: this.date,
                })
                .toPromise();

            if (!formationSearchResult) {
                throw new Error('存在しない編成・車両番号です');
            }

            if (!formationSearchResult.formations.length) {
                const vehicleSearchResult = await this.formationApi
                    .searchFormations({
                        agency_id: sighting.agencyId,
                        vehicle_number: sighting.formationOrVehicleNumber,
                        date: this.date,
                    })
                    .toPromise();

                if (
                    !vehicleSearchResult ||
                    !vehicleSearchResult.formations.length
                ) {
                    throw new Error('存在しない編成・車両番号です');
                }

                targetFormationId = vehicleSearchResult.formations[0].id;
            } else {
                targetFormationId = formationSearchResult.formations[0].id;
            }

            const currentParams = this.paramsQuery.getValue();

            const targetOperation = await this.operationApi
                .searchOperations({
                    calendar_id: currentParams.calendarId,
                    operation_number: sighting.operationNumber,
                })
                .toPromise();

            if (!targetOperation || !targetOperation.operations.length) {
                throw new Error('存在しない運用番号です');
            }

            const targetOperationId = targetOperation.operations[0].id;

            let sightingTime = moment();
            if (sighting.sightingTime) {
                if (moment().hour() < 4) {
                    sightingTime = moment(
                        sighting.sightingTime,
                        'HH:mm'
                    ).subtract(
                        moment(sighting.sightingTime, 'HH:mm').hour() >= 4
                            ? 1
                            : 0
                    );
                } else {
                    sightingTime = moment(sighting.sightingTime, 'HH:mm').add(
                        moment(sighting.sightingTime, 'HH:mm').hour() < 4
                            ? 1
                            : 0
                    );
                }
                if (moment() < sightingTime) {
                    throw new Error('未来の時刻を選択することはできません');
                }
            }

            const addResult = await this.operationApi
                .addOperationSighting({
                    formationId: targetFormationId,
                    operationId: targetOperationId,
                    sightingTime: sightingTime.toISOString(),
                })
                .toPromise();

            this.notification.open('目撃情報を送信しました', 'OK');
            this.socketService.emit('sendSighting', addResult);
            this._sendSightingEvent$.next();
        } catch (e) {
            this.notification.open(e.message, 'OK');
        }
    }

    async getCurrentFormationByVehicleNumber(
        agencyId: string,
        vehicleNumber: string,
        date: string
    ): Promise<IFormation[]> {
        const result = await this.formationApi
            .searchFormations({
                agency_id: agencyId,
                vehicle_number: vehicleNumber,
                date,
            })
            .pipe(
                map((data) => {
                    return data.formations.map((o) =>
                        FormationModel.readFormationDtoImpl(o)
                    );
                })
            )
            .toPromise();

        return result;
    }

    async getOperationByCalendarIdAndOperationNumber(
        calendarId: string,
        operationNumber: string
    ): Promise<IOperation[]> {
        const result = await this.operationApi
            .searchOperations({
                calendar_id: calendarId,
                operation_number: operationNumber,
            })
            .pipe(
                map((data) => {
                    return data.operations.map((o) =>
                        OperationModel.readOperationDtoImpl(o)
                    );
                })
            )
            .toPromise();

        return result;
    }
}
