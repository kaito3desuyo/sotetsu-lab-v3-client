import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { buildStationDetailsDto } from 'src/app/libs/station/infrastructure/builders/station-dto.builder';
import { environment } from 'src/environments/environment';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { buildServiceDetailsDto } from '../builders/service-dto.builder';
import { ServiceStationsModel } from '../models/service-stations.model';
import { ServiceModel } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceQuery {
    readonly #http = inject(HttpClient);
    readonly #apiUrl = environment.apiUrl + '/v2/services';

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<ServiceDetailsDto> | ServiceDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.#http
            .get<ServiceModel[]>(this.#apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildServiceDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildServiceDetailsDto(o));
                }),
            );
    }

    findOneWithStations(
        serviceId: ServiceDetailsDto['serviceId'],
        qb: RequestQueryBuilder,
    ): Observable<ServiceStationsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.#http
            .get<ServiceStationsModel>(
                this.#apiUrl + '/' + serviceId + '/stations',
                { params: httpParams },
            )
            .pipe(
                map((data) => {
                    return {
                        service: buildServiceDetailsDto(data.service),
                        stations: data.stations.map((o) =>
                            buildStationDetailsDto(o),
                        ),
                    };
                }),
            );
    }
}
