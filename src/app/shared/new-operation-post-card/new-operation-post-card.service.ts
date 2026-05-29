import { inject, Injectable } from '@angular/core';
import { map, Observable, Subject, tap } from 'rxjs';
import { PostOperationSightingDto } from 'src/app/libs/operation-sighting/usecase/dtos/post-operation-sighting.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { environment } from 'src/environments/environment';
import { OperationPostCardStore } from './new-operation-post-card.store';

@Injectable({ providedIn: 'root' })
export class NewOperationPostCardService {
    readonly #serviceService = inject(ServiceService);
    readonly #operationSightingService = inject(OperationSightingService);

    readonly #submitEvent = new Subject<void>();
    readonly submitEvent$ = this.#submitEvent.asObservable();

    fetchServiceAgencies(): Observable<void> {
        return this.#serviceService
            .findOneWithAgencies_V3({
                serviceId: environment.serviceId,
            })
            .pipe(
                tap((serviceAgencies) => {
                    OperationPostCardStore.setServiceAgencies(serviceAgencies);
                }),
                map(() => undefined),
            );
    }

    postOperationSighting(dto: PostOperationSightingDto): Observable<void> {
        return this.#operationSightingService.post(dto);
    }

    emitSubmitEvent(): void {
        this.#submitEvent.next();
    }
}
