import { findInboundDirection } from './inbound-direction.util';

// 路線の起点→終点の順（例 本線: 横浜 → … → 海老名）
const LINE = ['A', 'B', 'C'];

describe('findInboundDirection', () => {
    it('系統の始点が並びの先頭側なら towardStart（本線: 横浜 → 海老名）', () => {
        expect(
            findInboundDirection(LINE, {
                startStationId: 'A',
                endStationId: 'C',
            }),
        ).toBe('towardStart');
    });

    it('系統の始点が並びの末尾側なら towardEnd（新横浜線: 新横浜 → 西谷）', () => {
        expect(
            findInboundDirection(LINE, {
                startStationId: 'C',
                endStationId: 'A',
            }),
        ).toBe('towardEnd');
    });

    it('区間が路線の途中まででも、始点と終点の位置で決める', () => {
        expect(
            findInboundDirection(LINE, {
                startStationId: 'B',
                endStationId: 'A',
            }),
        ).toBe('towardEnd');
    });

    it('並びを裏返しても、その並びでの向きを返す', () => {
        expect(
            findInboundDirection([...LINE].reverse(), {
                startStationId: 'A',
                endStationId: 'C',
            }),
        ).toBe('towardEnd');
    });

    it('系統に無い・始点か終点が並びに無いなら null', () => {
        expect(findInboundDirection(LINE, undefined)).toBeNull();
        expect(
            findInboundDirection(LINE, {
                startStationId: 'X',
                endStationId: 'C',
            }),
        ).toBeNull();
    });
});
