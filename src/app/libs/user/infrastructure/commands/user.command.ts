import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RegisterUserDto } from '../../usecase/dtos/register-user.dto';
import { UserModelBuilder } from '../builders/user-model.builder';

@Injectable({ providedIn: 'root' })
export class UserCommand {
    readonly #http = inject(HttpClient);
    readonly #baseUrl = `${environment.backendUrl}/user`;

    registerUser(user: RegisterUserDto): Observable<void> {
        const model = UserModelBuilder.fromRegisterUserDto(user);

        return this.#http
            .post<void>(`${this.#baseUrl}/register`, model)
            .pipe(map(() => undefined));
    }
}
