import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { CalendarDateService } from 'src/app/libs/calendar/usecase/calendar-date.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RecordsFormationStore } from '../stores/records-formation.store';
import { buildHolidayNames } from '../utils/holiday-names.util';
import { monthPeriod } from '../utils/records-month.util';

/** 編成の記録の取得。カレンダー（月ごと）・祝日（月ごと）・要約と編成の期間（編成ごと）は別々に取る。 */
@Injectable()
export class RecordsFormationService {
    readonly #store = inject(RecordsFormationStore);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #formationService = inject(FormationService);
    readonly #calendarDateService = inject(CalendarDateService);

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

    /**
     * 編成の全期間（号車・車両・車両の改造の記録つき）を、編成番号ごとの口で取る。編成が変わったときだけ呼ぶ。
     * 取れなければ（番号の形が違う 422 も）空にする（編成の情報のカードを出さない）。
     */
    fetchFormationPeriods(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<void> {
        const { formationNumber, forceReload } = params;
        const isCurrent = (): boolean =>
            this.#store.formationNumber() === formationNumber;
        return this.#formationService
            .findManyByFormationNumber({
                formationNumber,
                include: 'vehicleFormations.vehicle.modifications,agency',
                ...(forceReload ? { forceReload: true } : {}),
            })
            .pipe(
                map((rows) => {
                    if (isCurrent()) {
                        this.#store.setFormationRows(formationNumber, rows);
                    }
                }),
                catchError((error: unknown) => {
                    console.error(error);
                    if (isCurrent()) {
                        this.#store.setFormationRows(formationNumber, []);
                    }
                    return of(undefined);
                }),
            );
    }

    /** 月の祝日名を取る。月を替えたら取り直す。取れなければ祝日名なしで出す */
    fetchHolidays(params: {
        month: string;
        forceReload?: boolean;
    }): Observable<void> {
        const { month, forceReload } = params;
        const seq = this.#store.nextHolidaySeq();
        return this.#calendarDateService
            .findMany({
                ...monthPeriod(month),
                ...(forceReload ? { forceReload: true } : {}),
            })
            .pipe(
                map((calendarDates) => {
                    if (this.#store.isLatestHolidayFetch(seq)) {
                        this.#store.setHolidays(
                            month,
                            buildHolidayNames(calendarDates),
                        );
                    }
                }),
                catchError((error: unknown) => {
                    console.error(error);
                    if (this.#store.isLatestHolidayFetch(seq)) {
                        this.#store.setHolidays(month, {});
                    }
                    return of(undefined);
                }),
            );
    }
}
