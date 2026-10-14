import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserCommand } from '../infrastructure/commands/user.command';
import { UserQuery } from '../infrastructure/queries/user.query';
import { RegisterUserDto } from './dtos/register-user.dto';
import { UserDetailsDto } from './dtos/user-details.dto';

@Injectable({ providedIn: 'root' })
export class UserService {
    readonly #userCommand = inject(UserCommand);
    readonly #userQuery = inject(UserQuery);

    getProfile(options?: {
        maxAgeMs?: number;
    }): Observable<UserDetailsDto | null> {
        return this.#userQuery.getProfile(options);
    }

    registerUser(dto: RegisterUserDto): Observable<void> {
        return this.#userCommand.registerUser(dto);
    }
}
