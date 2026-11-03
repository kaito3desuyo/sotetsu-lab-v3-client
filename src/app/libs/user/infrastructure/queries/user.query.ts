import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { MySummaryDto } from '../../usecase/dtos/my-summary.dto';
import { UserAccessTraceDto } from '../../usecase/dtos/user-access-trace.dto';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserSummaryDto } from '../../usecase/dtos/user-summary.dto';
import { UserDtoBuilder } from '../builders/user.dto.builder';
import { MySummaryModel } from '../models/my-summary.model';
import { UserAccessTraceModel } from '../models/user-access-trace.model';
import { UserSummaryModel } from '../models/user-summary.model';
import { UserModel } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserQuery {
    readonly #http = inject(HttpClient);
    readonly #backendUrl = environment.backendUrl + '/user';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/users';
    readonly #cache = new QueryCache();

    /**
     * ログインしていなければ null。
     * maxAgeMs を渡したとき（resolver）だけ、届いてからその間は使い回す。
     * 渡さなければ（ログイン・ログアウト）必ず取りに行き、取った値はキャッシュにも入れる。
     */
    getProfile(options?: {
        maxAgeMs?: number;
    }): Observable<UserDetailsDto | null> {
        const { maxAgeMs } = options ?? {};

        return this.#cache.get({
            name: 'getProfile',
            params: {},
            fetch: () =>
                this.#http.get<UserModel>(`${this.#backendUrl}/profile`).pipe(
                    map((res) => UserDtoBuilder.buildFromModel(res)),
                    // ゲストは 401 になる。失敗にせず「ゲスト（null）」としてキャッシュに入れる
                    catchError((error: unknown) =>
                        error instanceof FetchError && error.statusCode === 401
                            ? of(null)
                            : throwError(() => error),
                    ),
                ),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }

    /** 投稿管理の取得。QueryCache を通さず、呼ぶたびに取る */
    findSummary(userId: string): Observable<UserSummaryDto> {
        return this.#http
            .get<UserSummaryModel>(
                `${this.#v3ApiUrl}/${encodeURIComponent(userId)}`,
            )
            .pipe(map((model) => UserDtoBuilder.buildSummaryFromModel(model)));
    }

    /** 本人の投稿の要約。QueryCache を通さず、呼ぶたびに取る */
    findMySummary(): Observable<MySummaryDto> {
        return this.#http
            .get<MySummaryModel>(`${this.#v3ApiUrl}/me`)
            .pipe(
                map((model) => UserDtoBuilder.buildMySummaryFromModel(model)),
            );
    }

    /** 手がかり。QueryCache を通さず、呼ぶたびに取る */
    findAccessTraces(userId: string): Observable<UserAccessTraceDto[]> {
        return this.#http
            .get<UserAccessTraceModel[]>(
                `${this.#v3ApiUrl}/${encodeURIComponent(userId)}/traces`,
            )
            .pipe(
                map((models) =>
                    UserDtoBuilder.buildAccessTracesFromModels(models),
                ),
            );
    }
}
