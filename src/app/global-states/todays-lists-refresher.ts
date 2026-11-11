import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { TodaysCalendarListState } from './todays-calendar-list.state';
import { TodaysFormationListState } from './todays-formation-list.state';
import { TodaysOperationListState } from './todays-operation-list.state';

/**
 * 4 時をまたいで開いたままの画面で、前の営業日の一覧のまま判定しないようにする。
 * 今日のダイヤ・運用・編成の一覧が古ければ、この順に取り直す。
 */
@Injectable({ providedIn: 'root' })
export class TodaysListsRefresher {
    readonly #calendars = inject(TodaysCalendarListState);
    readonly #operations = inject(TodaysOperationListState);
    readonly #formations = inject(TodaysFormationListState);

    /** 取ってある一覧が前の営業日のものか（同期で答える） */
    isStale(now: Date = new Date()): boolean {
        return !this.#calendars.isForToday(now);
    }

    /** 取り直す必要が無い、または取り直せたら true。取り直しに失敗したら false（古い一覧のまま） */
    async refreshIfStale(now: Date = new Date()): Promise<boolean> {
        if (!this.isStale(now)) return true;
        try {
            // 営業日は全部取れてから記録する。途中で失敗したら古いままにして、次も取り直す
            await lastValueFrom(this.#calendars.fetch({ recordDate: false }));
            await lastValueFrom(this.#operations.fetch());
            await lastValueFrom(this.#formations.fetch());
            this.#calendars.markFetched(now);
            return true;
        } catch {
            return false;
        }
    }
}
