import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserDtoBuilder } from '../builders/user.dto.builder';
import { UserModel } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserQuery {
    readonly #http = inject(HttpClient);
    readonly #backendUrl = environment.backendUrl + '/user';
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
                        error instanceof HttpErrorResponse &&
                        error.status === 401
                            ? of(null)
                            : throwError(() => error),
                    ),
                ),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }
}
