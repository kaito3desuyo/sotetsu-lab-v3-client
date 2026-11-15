import {
    trigger,
    state,
    style,
    transition,
    animate,
} from '@angular/animations';

/**
 * ドロワーは transform で動かす。left で動かすと、移った先のページを描いている間に閉じる動きが
 * layout shift に数えられていた（ドロワーから列車位置情報へ移ると 0.204・2026-11-16 実測）。
 * transform の動きは layout shift に数えない
 */
export const layoutAnimations = [
    trigger('openClose', [
        state(
            'open',
            style({
                transform: 'translateX(0)',
            }),
        ),
        state(
            'close',
            style({
                transform: 'translateX(-256px)',
            }),
        ),
        state(
            'shadow',
            style({
                background: 'rgba(255, 255, 255, 0.2)',
                'backdrop-filter': 'blur(4px)',
            }),
        ),
        state(
            'clear',
            style({
                background: 'rgba(0,0,0,0.0)',
                'backdrop-filter': 'none',
            }),
        ),
        transition('close => open', [
            animate('0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'),
        ]),
        transition('open => close', [
            animate('0.25s cubic-bezier(0.4, 0.0, 0.2, 1)'),
        ]),
        transition('clear => shadow', [
            animate('0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'),
        ]),
        transition('shadow => clear', [
            animate('0.25s cubic-bezier(0.4, 0.0, 0.2, 1)'),
        ]),
    ]),
];
