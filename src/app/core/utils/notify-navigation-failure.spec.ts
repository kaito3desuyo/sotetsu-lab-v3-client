import { NotificationService } from '../services/notification.service';
import { notifyNavigationFailure } from './notify-navigation-failure';

describe('notifyNavigationFailure', () => {
    let notificationService: jest.Mocked<Pick<NotificationService, 'open'>>;

    beforeEach(() => {
        notificationService = { open: jest.fn() };
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function run(navigation: Promise<boolean>): Promise<void> {
        notifyNavigationFailure(
            navigation,
            notificationService as unknown as NotificationService,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    it('遷移できたら何も出さない', async () => {
        await run(Promise.resolve(true));

        expect(notificationService.open).not.toHaveBeenCalled();
    });

    it('遷移が終わらなかったら知らせる', async () => {
        await run(Promise.resolve(false));

        expect(notificationService.open).toHaveBeenCalledWith(
            'ページの遷移に失敗しました',
            'OK',
        );
    });

    it('遷移が失敗したら知らせる', async () => {
        await run(Promise.reject(new Error('boom')));

        expect(notificationService.open).toHaveBeenCalledWith(
            'ページの遷移に失敗しました',
            'OK',
        );
    });
});
