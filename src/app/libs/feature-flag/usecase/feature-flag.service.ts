import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FeatureFlagQuery } from '../infrastructure/queries/feature-flag.query';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
    readonly #featureFlagQuery = inject(FeatureFlagQuery);

    findAll(): Observable<Record<string, boolean>> {
        return this.#featureFlagQuery.findAll();
    }
}
