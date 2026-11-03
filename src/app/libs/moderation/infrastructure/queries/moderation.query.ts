import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ModerationPageParamsDto } from '../../usecase/dtos/moderation-page-params.dto';
import { ModerationRecentSightingDto } from '../../usecase/dtos/moderation-recent-sighting.dto';
import { ModerationSightingAuthorDto } from '../../usecase/dtos/moderation-sighting-author.dto';
import { ModerationSightingDto } from '../../usecase/dtos/moderation-sighting.dto';
import { ModerationTraceDto } from '../../usecase/dtos/moderation-trace.dto';
import { ModerationUserSummaryDto } from '../../usecase/dtos/moderation-user-summary.dto';
import { ModerationDtoBuilder } from '../builders/moderation.dto.builder';
import {
    ModerationRecentSightingModel,
    ModerationSightingModel,
} from '../models/moderation-sighting.model';
import { ModerationTraceModel } from '../models/moderation-trace.model';
import { ModerationUserSummaryModel } from '../models/moderation-user-summary.model';

/** 投稿管理の取得。QueryCache を通さず、呼ぶたびに取る */
@Injectable({ providedIn: 'root' })
export class ModerationQuery {
    readonly #http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/moderation';

    getUser(userId: string): Observable<ModerationUserSummaryDto> {
        return this.#http
            .get<ModerationUserSummaryModel>(
                `${this.#v3ApiUrl}/users/${encodeURIComponent(userId)}`,
            )
            .pipe(map((model) => ModerationDtoBuilder.buildUserSummary(model)));
    }

    getUserSightings(
        userId: string,
        params: ModerationPageParamsDto = {},
    ): Observable<ModerationSightingDto[]> {
        return this.#http
            .get<ModerationSightingModel[]>(
                `${this.#v3ApiUrl}/users/${encodeURIComponent(userId)}/sightings`,
                { params: this.#pageParams(params) },
            )
            .pipe(map((models) => ModerationDtoBuilder.buildSightings(models)));
    }

    getSightingAuthor(
        operationSightingId: string,
    ): Observable<ModerationSightingAuthorDto> {
        return this.#http
            .get<{
                userId: string | null;
            }>(
                `${this.#v3ApiUrl}/sightings/${encodeURIComponent(operationSightingId)}/author`,
            )
            .pipe(map(({ userId }) => ({ userId })));
    }

    getRecentSightings(
        params: ModerationPageParamsDto = {},
    ): Observable<ModerationRecentSightingDto[]> {
        return this.#http
            .get<ModerationRecentSightingModel[]>(
                `${this.#v3ApiUrl}/recent-sightings`,
                { params: this.#pageParams(params) },
            )
            .pipe(
                map((models) =>
                    ModerationDtoBuilder.buildRecentSightings(models),
                ),
            );
    }

    getUserTraces(userId: string): Observable<ModerationTraceDto[]> {
        return this.#http
            .get<ModerationTraceModel[]>(
                `${this.#v3ApiUrl}/users/${encodeURIComponent(userId)}/traces`,
            )
            .pipe(map((models) => ModerationDtoBuilder.buildTraces(models)));
    }

    #pageParams({ limit, before }: ModerationPageParamsDto): HttpParams {
        let params = new HttpParams();
        if (limit !== undefined) {
            params = params.set('limit', limit);
        }
        if (before !== undefined) {
            params = params.set('before', before);
        }
        return params;
    }
}
