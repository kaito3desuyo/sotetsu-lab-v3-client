import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginCommand } from '../infrastructure/commands/login.command';
import { LogoutCommand } from '../infrastructure/commands/logout.command';
import { TokenQuery } from '../infrastructure/queries/token.query';
import { LoginDto } from './dtos/login.dto';
import { TokenDetailsDto } from './dtos/token-details.dto';

@Injectable({ providedIn: 'root' })
export class AuthService {
    readonly #loginCommand = inject(LoginCommand);
    readonly #logoutCommand = inject(LogoutCommand);
    readonly #tokenQuery = inject(TokenQuery);

    login(dto: LoginDto): Observable<void> {
        return this.#loginCommand.login(dto);
    }

    logout(): Observable<void> {
        return this.#logoutCommand.logout();
    }

    getToken(): Observable<TokenDetailsDto> {
        return this.#tokenQuery.getToken();
    }
}
