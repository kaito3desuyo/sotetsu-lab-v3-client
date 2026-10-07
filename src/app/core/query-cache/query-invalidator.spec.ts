import { TestBed } from '@angular/core/testing';
import {
    QueryInvalidator,
    QueryInvalidationTag,
    RELOAD_WINDOW_MS,
    WRITTEN_AT_KEYS,
} from './query-invalidator';

describe('QueryInvalidator', () => {
    const setup = () => {
        TestBed.configureTestingModule({});
        const invalidator = TestBed.inject(QueryInvalidator);
        const tags: QueryInvalidationTag[] = [];
        invalidator.invalidated$.subscribe((t) => tags.push(t));
        return { invalidator, tags };
    };

    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('invalidate した tag をそのまま流す', () => {
        const { invalidator, tags } = setup();

        invalidator.invalidate('sighting');
        invalidator.invalidate('timetable');

        expect(tags).toEqual(['sighting', 'timetable']);
    });

    it('書き込みが無ければ時刻表の取得は default', () => {
        const { invalidator } = setup();

        expect(invalidator.requestCache('timetable')).toBe('default');
    });

    it("'timetable' から 1 時間（API の max-age=3600）のあいだは reload、過ぎたら default", () => {
        const { invalidator } = setup();

        invalidator.invalidate('timetable');
        expect(invalidator.requestCache('timetable')).toBe('reload');

        jest.advanceTimersByTime(60 * 60 * 1000 - 1);
        expect(invalidator.requestCache('timetable')).toBe('reload');

        jest.advanceTimersByTime(1);
        expect(invalidator.requestCache('timetable')).toBe('default');
    });

    it("'timetable' の時刻を localStorage に書き、読み込み直した後のサービスも引き継ぐ", () => {
        const { invalidator } = setup();
        invalidator.invalidate('timetable');

        expect(localStorage.getItem(WRITTEN_AT_KEYS.timetable)).toBe(
            String(Date.now()),
        );

        TestBed.resetTestingModule();
        const { invalidator: reloaded } = setup();
        expect(reloaded.requestCache('timetable')).toBe('reload');
    });

    it("'sighting' では列車情報の時刻を書かない", () => {
        const { invalidator } = setup();

        invalidator.invalidate('sighting');

        expect(localStorage.getItem(WRITTEN_AT_KEYS.timetable)).toBeNull();
        expect(invalidator.requestCache('timetable')).toBe('default');
    });

    it('localStorage が投げても、そのタブでは 1 時間の窓が効く', () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { invalidator, tags } = setup();

        expect(() => invalidator.invalidate('timetable')).not.toThrow();
        expect(tags).toEqual(['timetable']);
        expect(invalidator.requestCache('timetable')).toBe('reload');
    });

    it("別のタブが時刻を書いたら（storage イベント）、このタブでも 'timetable' を流して reload にする", () => {
        const { invalidator, tags } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: WRITTEN_AT_KEYS.timetable,
                newValue: String(Date.now()),
            }),
        );

        expect(tags).toEqual(['timetable']);
        expect(invalidator.requestCache('timetable')).toBe('reload');
    });

    it("'sighting' の時刻を目撃用のキーに書く", () => {
        const { invalidator } = setup();

        invalidator.invalidate('sighting');

        expect(localStorage.getItem(WRITTEN_AT_KEYS.sighting)).toBe(
            String(Date.now()),
        );
    });

    it("別のタブが目撃を書いたら（storage イベント）、このタブでも 'sighting' を流し、時刻表は reload にしない", () => {
        const { invalidator, tags } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: WRITTEN_AT_KEYS.sighting,
                newValue: String(Date.now()),
            }),
        );

        expect(tags).toEqual(['sighting']);
        expect(invalidator.requestCache('timetable')).toBe('default');
    });

    it("localStorage が投げても、'sighting' はこのタブに流す", () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { invalidator, tags } = setup();

        expect(() => invalidator.invalidate('sighting')).not.toThrow();
        expect(tags).toEqual(['sighting']);
    });

    it('invalidateLocal はこのタブで流すだけで、localStorage には書かない', () => {
        const { invalidator, tags } = setup();

        invalidator.invalidateLocal('sighting');

        expect(tags).toEqual(['sighting']);
        expect(localStorage.getItem(WRITTEN_AT_KEYS.sighting)).toBeNull();
    });

    it("'sighting' は窓が 0（API が no-store）なので、書いた直後でも default", () => {
        const { invalidator } = setup();

        invalidator.invalidate('sighting');

        expect(RELOAD_WINDOW_MS.sighting).toBe(0);
        expect(invalidator.requestCache('sighting')).toBe('default');
    });

    it('窓は tag ごとに、その tag の書き込み時刻だけで決まる', () => {
        jest.replaceProperty(RELOAD_WINDOW_MS, 'sighting', 60_000);
        const { invalidator } = setup();

        invalidator.invalidate('sighting');
        expect(invalidator.requestCache('sighting')).toBe('reload');
        expect(invalidator.requestCache('timetable')).toBe('default');

        jest.advanceTimersByTime(60_000);
        expect(invalidator.requestCache('sighting')).toBe('default');
    });

    it('別のタブで目撃が書かれたら、その時刻も目撃の窓に使う', () => {
        jest.replaceProperty(RELOAD_WINDOW_MS, 'sighting', 60_000);
        const { invalidator } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: WRITTEN_AT_KEYS.sighting,
                newValue: String(Date.now()),
            }),
        );

        expect(invalidator.requestCache('sighting')).toBe('reload');
    });

    it('関係ないキーの storage イベントでは流さない', () => {
        const { tags } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', { key: 'other', newValue: '1' }),
        );

        expect(tags).toEqual([]);
    });
});
