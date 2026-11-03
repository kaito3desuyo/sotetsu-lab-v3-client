import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { InvalidateManyOperationSightingsResultDto } from '../../usecase/dtos/invalidate-many-operation-sightings-result.dto';
import { InvalidateManyOperationSightingsDto } from '../../usecase/dtos/invalidate-many-operation-sightings.dto';
import { InvalidateOperationSightingDto } from '../../usecase/dtos/invalidate-operation-sighting.dto';
import { PostOperationSightingDto } from '../../usecase/dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from '../../usecase/dtos/restore-operation-sighting.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting.dto.builder';
import { InvalidateManyOperationSightingsResultModel } from '../models/invalidate-many-operation-sightings-result.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingCommand {
    readonly #http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';

    post(body: PostOperationSightingDto): Observable<void> {
        return this.#http
            .post(`${this.#v3ApiUrl}`, body)
            .pipe(map(() => undefined));
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.#http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/invalidate`, body)
            .pipe(map(() => undefined));
    }

    invalidateMany(
        body: InvalidateManyOperationSightingsDto,
    ): Observable<InvalidateManyOperationSightingsResultDto> {
        return this.#http
            .post<InvalidateManyOperationSightingsResultModel>(
                `${this.#v3ApiUrl}/invalidate`,
                { ids: body.ids, reason: body.reason },
            )
            .pipe(
                map((model) =>
                    OperationSightingDtoBuilder.buildInvalidateManyResultFromModel(
                        model,
                    ),
                ),
            );
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.#http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/restore`, body)
            .pipe(map(() => undefined));
    }
}
