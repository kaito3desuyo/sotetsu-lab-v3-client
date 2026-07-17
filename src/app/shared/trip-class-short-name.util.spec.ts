import { shortTripClassName } from './trip-class-short-name.util';

describe('shortTripClassName', () => {
    it('「各駅停車」を「各停」に短縮する（98 §G5・mockup-05）', () => {
        expect(shortTripClassName('各駅停車')).toBe('各停');
    });

    it('系統サフィックス付きの「各駅停車（…）」も「各停」に短縮する', () => {
        expect(shortTripClassName('各駅停車（SO）')).toBe('各停');
    });

    it('元から短い「各停」はそのまま返す（他社データとの混在対応）', () => {
        expect(shortTripClassName('各停')).toBe('各停');
    });

    it('マッピングに無い種別はベース名（系統サフィックス除去のみ）を返す', () => {
        expect(shortTripClassName('特急（SO→TY）')).toBe('特急');
        expect(shortTripClassName('通勤特急')).toBe('通勤特急');
    });

    it('null / undefined / 空文字は空文字を返す', () => {
        expect(shortTripClassName(null)).toBe('');
        expect(shortTripClassName(undefined)).toBe('');
        expect(shortTripClassName('')).toBe('');
    });
});
