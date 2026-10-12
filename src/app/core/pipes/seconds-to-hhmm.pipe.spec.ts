import { SecondsToHhmmPipe } from './seconds-to-hhmm.pipe';

describe('SecondsToHhmmPipe', () => {
    const pipe = new SecondsToHhmmPipe();

    it('30600 秒は 08:30', () => {
        expect(pipe.transform(30600)).toBe('08:30');
    });

    it('86400 秒以上は 24 時間を引く（87000 秒は 00:10）', () => {
        expect(pipe.transform(87000)).toBe('00:10');
    });
});
