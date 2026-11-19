import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RecordsFormationStore } from '../stores/records-formation.store';
import { monthPeriod } from '../utils/records-month.util';

/** 編成の記録の取得。カレンダー（月ごと）と要約（編成ごと）は別々に取る。 */
@Injectable()
export class RecordsFormationService {
    readonly #store = inject(RecordsFormationStore);
    readonly #operationSightingService = inject(OperationSightingService);

    /** 月の目撃を取る。取っている間に新しい取得が始まったら、古い結果は捨てる */
    fetchMonth(params: {
        formationNumber: string;
        month: string;
        forceReload?: boolean;
    }): Observable<void> {
        const { formationNumber, month, forceReload } = params;
        const seq = this.#store.nextFetchSeq();
        this.#store.startMonth({ formationNumber, month });
        this.#store.enableLoading();
        return this.#operationSightingService
            .findManyBySpecificPeriod({
                ...monthPeriod(month),
                includeCarriedOver: true,
                formationNumber,
                ...(forceReload ? { forceReload: true } : {}),
            })
            .pipe(
                map((sightings) => {
                    if (!this.#store.isLatestFetch(seq)) return;
                    this.#store.setSightings(sightings);
                    this.#store.setLoaded(true);
                }),
                catchError((error: unknown) => {
                    console.error(error);
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.setLoadError(true);
                        this.#store.setLoaded(true);
                    }
                    return of(undefined);
                }),
                finalize(() => this.#store.disableLoading()),
            );
    }

    /** 要約（今日・最後に見た日）を取る。編成が変わったときだけ呼ぶ */
    fetchSummary(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<void> {
        const { formationNumber, forceReload } = params;
        this.#store.startSummary();
        const isCurrent = (): boolean =>
            this.#store.formationNumber() === formationNumber;
        return this.#operationSightingService
            .findOneTimeCrossSectionByFormationNumber({
                formationNumber,
                ...(forceReload ? { forceReload: true } : {}),
            })
            .pipe(
                map((summary) => {
                    if (isCurrent()) {
                        this.#store.setSummary(formationNumber, summary);
                    }
                }),
                catchError((error: unknown) => {
                    console.error(error);
                    if (isCurrent())
                        this.#store.setSummaryError(formationNumber);
                    return of(undefined);
                }),
            );
    }
}
