import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CreateOperationSightingDto } from '../../usecase/dtos/create-operation-sighting.dto';
import { InvalidateOperationSightingDto } from '../../usecase/dtos/invalidate-operation-sighting.dto';
import { RestoreOperationSightingDto } from '../../usecase/dtos/restore-operation-sighting.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting-dto.builder';
import { OperationSightingModelBuilder } from '../builders/operation-sighting.model.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingCommand {
    private readonly apiUrl = environment.apiUrl + '/v2/operation-sightings';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';

    constructor(private readonly http: HttpClient) {}

    createOne(qb: RequestQueryBuilder, body: CreateOperationSightingDto) {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .post<OperationSightingModel>(
                this.apiUrl,
                OperationSightingModelBuilder.fromCreateDto(body),
                { params: httpParams },
            )
            .pipe(
                map((model) => OperationSightingDtoBuilder.toDetailsDto(model)),
            );
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/invalidate`, body)
            .pipe(map(() => undefined));
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/restore`, body)
            .pipe(map(() => undefined));
    }
}
