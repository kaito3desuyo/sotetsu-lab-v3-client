import { LIVERIES } from '../constants/livery';
import { buildCarArt } from './car-art.util';

describe('buildCarArt', () => {
    it('どの塗装・どの向きでも車体の形が組み立てられる', () => {
        for (const livery of [...LIVERIES, null]) {
            for (const cab of ['left', 'right', null] as const) {
                const art = buildCarArt(livery, cab);
                expect(art.bodyPath).toMatch(/^M[-\d.]+,4 H/);
                expect(art.bodyPath).not.toContain('NaN');
                expect(JSON.stringify(art.clipped)).not.toContain('NaN');
            }
        }
    });

    it('塗装が無ければ灰色一色で、帯も模様も無い', () => {
        const art = buildCarArt(null, null);
        expect(art.bodyFill).toBe('#b8bdc4');
        expect(art.clipped).toEqual([]);
    });

    it('窓と扉は描かない（帯と台車以外の図形が無い）', () => {
        const art = buildCarArt('10000-group', null);
        expect(art.clipped).toHaveLength(2);
        expect(art.bogies).toHaveLength(2);
    });

    it('帯は軒 0・裾 1 の割合で、車体の高さ 36（軒 y=4）に置く（10000 の青 0〜0.15）', () => {
        const art = buildCarArt('10000-group', null);
        expect(art.clipped[0]).toMatchObject({
            type: 'rect',
            x: 0,
            width: 100,
            fill: '#1c5fc8',
        });
        const [blue, orange] = art.clipped;
        if (blue.type !== 'rect' || orange.type !== 'rect') throw new Error();
        expect(blue.y).toBeCloseTo(4);
        expect(blue.height).toBeCloseTo(5.4);
        expect(orange.y).toBeCloseTo(4 + 0.88 * 36);
        expect(orange.height).toBeCloseTo(0.07 * 36);
    });

    it('扉の所で途切れる帯も、車長いっぱいに続けて描く（東急 5050 の赤）', () => {
        const art = buildCarArt('tokyu-5050', null);
        const red = art.clipped.find(
            (s) => s.type === 'rect' && s.fill === '#e0262d',
        );
        expect(red).toMatchObject({ x: 0, width: 100 });
    });

    it('YNB・12000・13000・20000・21000 は帯が無い', () => {
        for (const livery of [
            '8000-ynb',
            '9000-ynb',
            '10000-ynb',
            '12000',
            '13000',
            '20000',
            '21000',
        ] as const) {
            expect(buildCarArt(livery, null).clipped).toEqual([]);
        }
    });

    it('9000 旧塗装の S 帯は右端の先頭車だけにある', () => {
        const right = buildCarArt('9000-red', 'right');
        const left = buildCarArt('9000-red', 'left');
        const middle = buildCarArt('9000-red', null);
        expect(right.clipped.filter((s) => s.type === 'path')).toHaveLength(1);
        expect(left.clipped.filter((s) => s.type === 'path')).toHaveLength(0);
        expect(middle.clipped).toHaveLength(2);
    });

    it('新7000 旧塗装には斜めの飾り（白の縁とオレンジ）がある', () => {
        const art = buildCarArt('new7000-red', null);
        expect(art.clipped.filter((s) => s.type === 'path')).toHaveLength(2);
    });

    it('東急 3020 の先頭車には水色の線がある。中間車は帯だけ', () => {
        const cab = buildCarArt('tokyu-3020', 'right');
        expect(
            cab.clipped.some(
                (s) => s.type === 'path' && s.stroke === '#3fa9d6',
            ),
        ).toBe(true);
        const middle = buildCarArt('tokyu-3020', null);
        expect(middle.clipped.every((s) => s.type === 'rect')).toBe(true);
    });

    it('10000 は先頭の端に縦の青がある', () => {
        const left = buildCarArt('10000-group', 'left');
        expect(left.clipped).toHaveLength(3);
    });

    it('先頭の形は向きの側の端だけが変わる（12000 を右先頭にすると左端は箱のまま）', () => {
        expect(buildCarArt('12000', 'right').bodyPath).not.toBe(
            buildCarArt('12000', null).bodyPath,
        );
        expect(buildCarArt('12000', null).bodyPath).toBe(
            buildCarArt('12000', null).bodyPath,
        );
    });
});
