import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenDetailsDto } from '../../usecase/dtos/token-details.dto';

@Injectable({ providedIn: 'root' })
export class TokenQuery {
    readonly #http: HttpClient;
    readonly #baseUrl = environment.backendUrl + '/auth';

    constructor(handler: HttpBackend) {
        this.#http = new HttpClient(handler);
    }

    getToken(): Observable<TokenDetailsDto> {
        return this.#http.get<TokenDetailsDto>(`${this.#baseUrl}/token`);
    }
}
