import {
    AnimationStateMetadata,
    AnimationStyleMetadata,
} from '@angular/animations';
import { layoutAnimations } from './layout.animation';

describe('layoutAnimations', () => {
    const states = (layoutAnimations[0].definitions as AnimationStateMetadata[])
        .filter((d) => 'name' in d && 'styles' in d)
        .reduce<Record<string, Record<string, string | number>>>((acc, d) => {
            acc[d.name] = (d.styles as AnimationStyleMetadata).styles as Record<
                string,
                string | number
            >;
            return acc;
        }, {});

    it('ドロワーは transform で開け閉めし、left は動かさない（閉じる動きを layout shift に数えさせない）', () => {
        expect(states['open']).toEqual({ transform: 'translateX(0)' });
        expect(states['close']).toEqual({ transform: 'translateX(-256px)' });
    });
});
