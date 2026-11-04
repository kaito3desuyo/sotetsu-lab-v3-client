import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { UserCommand } from '../infrastructure/commands/user.command';
import { UserQuery } from '../infrastructure/queries/user.query';
import { MySummaryDto } from './dtos/my-summary.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { UserAccessTraceDto } from './dtos/user-access-trace.dto';
import { UserDetailsDto } from './dtos/user-details.dto';
import { UserSummaryDto } from './dtos/user-summary.dto';

@Injectable({ providedIn: 'root' })
export class UserService {
    readonly #userCommand = inject(UserCommand);
    readonly #userQuery = inject(UserQuery);

    readonly #queryInvalidator = inject(QueryInvalidator);

    getProfile(options?: {
        maxAgeMs?: number;
    }): Observable<UserDetailsDto | null> {
        return this.#userQuery.getProfile(options);
    }

    registerUser(dto: RegisterUserDto): Observable<void> {
        return this.#userCommand.registerUser(dto);
    }

    findSummary(userId: string): Observable<UserSummaryDto> {
        return this.#userQuery.findSummary(userId);
    }

    findMySummary(): Observable<MySummaryDto> {
        return this.#userQuery.findMySummary();
    }

    findAccessTraces(userId: string): Observable<UserAccessTraceDto[]> {
        return this.#userQuery.findAccessTraces(userId);
    }

    ban(userId: string, reason: string): Observable<UserSummaryDto> {
        return this.#userCommand
            .ban(userId, reason)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    unban(userId: string, reason?: string): Observable<UserSummaryDto> {
        return this.#userCommand
            .unban(userId, reason)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }
}
