import {
    trigger,
    state,
    style,
    transition,
    animate,
} from '@angular/animations';

export const layoutAnimations = [
    trigger('openClose', [
        state(
            'open',
            style({
                left: '0px',
            })
        ),
        state(
            'close',
            style({
                left: '-256px',
            })
        ),
        state(
            'shadow',
            style({
                background: 'rgba(255, 255, 255, 0.2)',
                'backdrop-filter': 'blur(4px)',
            })
        ),
        state(
            'clear',
            style({
                background: 'rgba(0,0,0,0.0)',
                'backdrop-filter': 'none',
            })
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
