import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserDtoBuilder } from '../builders/user-dto.builder';
import { UserModel } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserQuery {
    readonly #http = inject(HttpClient);
    readonly #backendUrl = environment.backendUrl + '/user';

    getProfile(): Observable<UserDetailsDto> {
        return this.#http.get(`${this.#backendUrl}/profile`).pipe(
            map((res: UserModel) => {
                return UserDtoBuilder.fromModel(res);
            }),
        );
    }
}
