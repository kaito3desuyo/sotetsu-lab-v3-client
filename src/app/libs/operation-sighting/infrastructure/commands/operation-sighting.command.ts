import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FetchError } from 'src/app/core/classes/custom-error';
import { environment } from 'src/environments/environment';
import { InvalidateOperationSightingDto } from '../../usecase/dtos/invalidate-operation-sighting.dto';
import { PostOperationSightingDto } from '../../usecase/dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from '../../usecase/dtos/restore-operation-sighting.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingCommand {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';

    constructor(private readonly http: HttpClient) {}

    post(body: PostOperationSightingDto): Observable<void> {
        return this.http.post(`${this.#v3ApiUrl}`, body).pipe(
            map(() => undefined),
            catchError(({ status, error }) => {
                return throwError(
                    () =>
                        new FetchError(
                            status,
                            error?.message ?? '不明なエラーが発生しました',
                        ),
                );
            }),
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
