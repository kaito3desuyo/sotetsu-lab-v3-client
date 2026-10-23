import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { NotificationService } from 'src/app/core/services/notification.service';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { TokenStateStore } from 'src/app/global-states/token.state';
import {
    UserStateQuery,
    UserStateStore,
} from 'src/app/global-states/user.state';

/**
 * 時刻表の入力（追加・コピー・更新）は editor / manager だけ。
 * ガードは親ルートの initialDataResolver より先に走るので、直接開いたときは利用者の状態がまだ空。
 * そこで resolver と同じ取得（トークンと profile、ROUTE_CHECK_MAX_AGE_MS の使い回し）をここで先に済ませる。
 */
export const timetableEditGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const notification = inject(NotificationService);
    const tokenStateStore = inject(TokenStateStore);
    const userStateStore = inject(UserStateStore);
    const userStateQuery = inject(UserStateQuery);

    await Promise.all([
        lastValueFrom(
            tokenStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
        lastValueFrom(
            userStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
    ]);

    if (userStateQuery.canEditTimetable) {
        return true;
    }

    if (!userStateQuery.userId) {
        return router.createUrlTree(['/login'], {
            queryParams: { return_to: safeReturnTo(state.url) },
        });
    }

    notification.open('時刻表を入力する権限がありません', 'OK');
    return router.parseUrl('/');
};
