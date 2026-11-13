import { formatTrainDiagramSummary } from './train-diagram-summary.util';

describe('formatTrainDiagramSummary', () => {
    it('路線・方向・ダイヤ名（選んだ主なものを先に。docs/design.md 操作帯）', () => {
        expect(
            formatTrainDiagramSummary({
                routes: '本線',
                calendarName: '平日',
                direction: 'down',
            }),
        ).toBe('本線 下り 平日');
    });
    it('両方は「上り・下り」', () => {
        expect(
            formatTrainDiagramSummary({
                routes: '全路線',
                calendarName: '土休日',
                direction: 'both',
            }),
        ).toBe('全路線 上り・下り 土休日');
    });
});
