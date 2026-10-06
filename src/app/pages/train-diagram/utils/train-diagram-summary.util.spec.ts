import { formatTrainDiagramSummary } from './train-diagram-summary.util';

describe('formatTrainDiagramSummary', () => {
    it('路線・ダイヤ名・方向', () => {
        expect(
            formatTrainDiagramSummary({
                routes: '本線',
                calendarName: '平日',
                direction: 'down',
            }),
        ).toBe('本線 平日 下り');
    });
    it('両方は「上り・下り」', () => {
        expect(
            formatTrainDiagramSummary({
                routes: '全路線',
                calendarName: '土休日',
                direction: 'both',
            }),
        ).toBe('全路線 土休日 上り・下り');
    });
});
