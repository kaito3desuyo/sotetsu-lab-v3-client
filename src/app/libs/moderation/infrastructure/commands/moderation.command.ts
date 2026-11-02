import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { InvalidateSightingsDto } from '../../usecase/dtos/invalidate-sightings.dto';
import { ModerationBulkInvalidateResultDto } from '../../usecase/dtos/moderation-bulk-invalidate-result.dto';
import { ModerationUserSummaryDto } from '../../usecase/dtos/moderation-user-summary.dto';
import { ModerationDtoBuilder } from '../builders/moderation.dto.builder';
import { ModerationBulkInvalidateResultModel } from '../models/moderation-bulk-invalidate-result.model';
import { ModerationUserSummaryModel } from '../models/moderation-user-summary.model';

@Injectable({ providedIn: 'root' })
export class ModerationCommand {
    readonly #http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/moderation';

    invalidateSightings(
        body: InvalidateSightingsDto,
    ): Observable<ModerationBulkInvalidateResultDto> {
        return this.#http
            .post<ModerationBulkInvalidateResultModel>(
                `${this.#v3ApiUrl}/sightings/invalidate`,
                { ids: body.ids, reason: body.reason },
            )
            .pipe(
                map((model) =>
                    ModerationDtoBuilder.buildBulkInvalidateResult(model),
                ),
            );
    }

    ban(userId: string, reason: string): Observable<ModerationUserSummaryDto> {
        return this.#http
            .post<ModerationUserSummaryModel>(
                `${this.#v3ApiUrl}/users/${userId}/ban`,
                { reason },
            )
            .pipe(map((model) => ModerationDtoBuilder.buildUserSummary(model)));
    }

    unban(
        userId: string,
        reason?: string,
    ): Observable<ModerationUserSummaryDto> {
        return this.#http
            .post<ModerationUserSummaryModel>(
                `${this.#v3ApiUrl}/users/${userId}/unban`,
                reason === undefined ? {} : { reason },
            )
            .pipe(map((model) => ModerationDtoBuilder.buildUserSummary(model)));
    }
}
