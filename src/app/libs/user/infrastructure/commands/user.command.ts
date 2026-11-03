import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RegisterUserDto } from '../../usecase/dtos/register-user.dto';
import { UserSummaryDto } from '../../usecase/dtos/user-summary.dto';
import { UserDtoBuilder } from '../builders/user.dto.builder';
import { UserModelBuilder } from '../builders/user.model.builder';
import { UserSummaryModel } from '../models/user-summary.model';

@Injectable({ providedIn: 'root' })
export class UserCommand {
    readonly #http = inject(HttpClient);
    readonly #baseUrl = `${environment.backendUrl}/user`;
    readonly #v3ApiUrl = `${environment.apiUrl}/v3/users`;

    registerUser(user: RegisterUserDto): Observable<void> {
        const model = UserModelBuilder.buildFromRegisterUserDto(user);

        return this.#http
            .post<void>(`${this.#baseUrl}/register`, model)
            .pipe(map(() => undefined));
    }

    ban(userId: string, reason: string): Observable<UserSummaryDto> {
        return this.#http
            .post<UserSummaryModel>(
                `${this.#v3ApiUrl}/${encodeURIComponent(userId)}/ban`,
                { reason },
            )
            .pipe(map((model) => UserDtoBuilder.buildSummaryFromModel(model)));
    }

    unban(userId: string, reason?: string): Observable<UserSummaryDto> {
        return this.#http
            .post<UserSummaryModel>(
                `${this.#v3ApiUrl}/${encodeURIComponent(userId)}/unban`,
                reason === undefined ? {} : { reason },
            )
            .pipe(map((model) => UserDtoBuilder.buildSummaryFromModel(model)));
    }
}
