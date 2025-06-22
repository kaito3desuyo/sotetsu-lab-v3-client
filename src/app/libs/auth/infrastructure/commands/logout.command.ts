import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class LogoutCommand {
    readonly #http = inject(HttpClient);
    readonly #baseUrl = `${environment.backendUrl}/auth`;

    logout(): Observable<void> {
        return this.#http
            .post<void>(`${this.#baseUrl}/logout`, {})
            .pipe(map(() => undefined));
    }
}
