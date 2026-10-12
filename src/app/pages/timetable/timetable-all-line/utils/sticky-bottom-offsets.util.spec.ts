import { stickyBottomOffsets } from './sticky-bottom-offsets.util';

describe('stickyBottomOffsets', () => {
    it('上から並べた段の高さから、各段の bottom（それより下の段の高さの合計）を返す', () => {
        expect(stickyBottomOffsets([24, 80, 37, 36, 36, 37])).toEqual([
            226, 146, 109, 73, 37, 0,
        ]);
    });

    it('固定しない段は null にし、その高さは上の段の bottom に数えない', () => {
        expect(
            stickyBottomOffsets(
                [24, 80, 37, 36, 36, 37],
                [true, true, false, false, false, false],
            ),
        ).toEqual([80, 0, null, null, null, null]);
    });

    it('段が無ければ空', () => {
        expect(stickyBottomOffsets([])).toEqual([]);
    });
});
