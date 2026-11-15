import { TestBed } from '@angular/core/testing';
import { APP_LOCATION } from './app-update.service';
import { StaleChunkReload } from './stale-chunk-reload';

describe('StaleChunkReload', () => {
    let assign: jest.Mock;
    let reloader: StaleChunkReload;

    beforeEach(() => {
        sessionStorage.clear();
        assign = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: APP_LOCATION,
                    useValue: { assign, reload: jest.fn() },
                },
            ],
        });
        reloader = TestBed.inject(StaleChunkReload);
    });

    it('移ろうとした URL を読み込み直す', () => {
        expect(reloader.reload('/timetable/station')).toBe(true);
        expect(assign).toHaveBeenCalledWith('/timetable/station');
    });

    it('一度読み込み直しを始めたら、後から別の URL で呼ばれても上書きしない', () => {
        reloader.reload('/timetable/station');
        expect(reloader.reload('/')).toBe(true);
        expect(assign).toHaveBeenCalledTimes(1);
        expect(assign).toHaveBeenCalledWith('/timetable/station');
    });

    it('前のページで試した URL では読み込み直さない（回し続けない）', () => {
        sessionStorage.setItem('stale-chunk-reload-url', '/guide');
        expect(reloader.reload('/guide')).toBe(false);
        expect(assign).not.toHaveBeenCalled();
    });

    it('reloadCurrent は今の URL（path・search・hash）を読み込み直す', () => {
        window.history.replaceState(null, '', '/operation/real-time?x=1#a');
        expect(reloader.reloadCurrent()).toBe(true);
        expect(assign).toHaveBeenCalledWith('/operation/real-time?x=1#a');
    });
});
