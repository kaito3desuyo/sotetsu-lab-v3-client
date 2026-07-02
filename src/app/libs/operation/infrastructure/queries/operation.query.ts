import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { omitBy } from 'es-toolkit';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';
import { environment } from 'src/environments/environment';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationTripsDto } from '../../usecase/dtos/operation-trips.dto';
import {
    OperationDtoBuilder,
    OperationsDtoBuilder,
} from '../builders/operation.dto.builder';
import { OperationCurrentPositionDtoBuilder } from '../builders/operation-current-position.dto.builder';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationTripsModel } from '../models/operation-trips.model';
import { OperationModel } from '../models/operation.model';

@Injectable({ providedIn: 'root' })
export class OperationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operations';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { calendarId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByCalendarId',
                calendarId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<
                    OperationModel[]
                >(`${this.#v3ApiUrl}/calendar/${calendarId}`, { observe: 'response' })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationsDtoBuilder.buildFromModels(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { from, to, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyBySpecificPeriod',
                from,
                to,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<
                    OperationModel[]
                >(`${this.#v3ApiUrl}/from/${from}/to/${to}`, { observe: 'response' })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationsDtoBuilder.buildFromModels(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }

    findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto> {
        const { operationId, searchTime, forceReload } = params;

        const httpParams = new HttpParams({
            fromObject: omitBy({ searchTime }, (v) => v === undefined),
        });

        const key = md5(
            JSON.stringify({
                name: 'findOneWithCurrentPosition',
                operationId,
                searchTime,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<OperationCurrentPositionModel>(
                    `${this.#v3ApiUrl}/${operationId}/current-position`,
                    {
                        params: httpParams,
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationCurrentPositionDtoBuilder.buildFromModel(
                            res.body,
                        );
                    }),
                );
        }

        return this.#obs[key];
    }

    findOneWithTrips(params: {
        operationId: string;
        forceReload?: boolean;
    }): Observable<OperationTripsDto> {
        const { operationId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneWithTrips',
                operationId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<OperationTripsModel>(
                    `${this.#v3ApiUrl}/${operationId}/trips`,
                    { observe: 'response' },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => ({
                        operation: OperationDtoBuilder.buildFromModel(
                            res.body.operation,
                        ),
                        trips: res.body.trips.map((o) =>
                            TripOperationListDtoBuilder.buildFromModel(o),
                        ),
                    })),
                );
        }

        return this.#obs[key];
    }

}

