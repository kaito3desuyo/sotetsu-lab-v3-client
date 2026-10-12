import { NotificationService } from '../services/notification.service';

/**
 * 遷移が終わらなかった・失敗したときに知らせる。
 * 検索・投稿カードの「移る」ボタンで共通に使う。
 */
export function notifyNavigationFailure(
    navigation: Promise<boolean>,
    notificationService: NotificationService,
): void {
    navigation
        .then((succeeded) => {
            if (!succeeded) {
                console.error('navigation did not complete');
                notificationService.open('ページの遷移に失敗しました', 'OK');
            }
        })
        .catch((error) => {
            console.error('navigation failed', error);
            notificationService.open('ページの遷移に失敗しました', 'OK');
        });
}
