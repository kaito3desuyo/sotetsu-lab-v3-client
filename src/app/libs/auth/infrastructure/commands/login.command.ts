import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LoginDto } from '../../usecase/dtos/login.dto';
import { LoginModelBuilder } from '../builders/login-model.builder';

@Injectable({ providedIn: 'root' })
export class LoginCommand {
    readonly #http = inject(HttpClient);
    readonly #baseUrl = `${environment.backendUrl}/auth`;

    login(dto: LoginDto): Observable<void> {
        const model = LoginModelBuilder.fromLoginDto(dto);
        return this.#http
            .post<void>(`${this.#baseUrl}/login`, model)
            .pipe(map(() => undefined));
    }
}
