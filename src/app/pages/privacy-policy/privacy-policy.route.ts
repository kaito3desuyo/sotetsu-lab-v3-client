import { Route } from '@angular/router';

export const PRIVACY_POLICY_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./privacy-policy.component').then(
                (mod) => mod.PrivacyPolicyComponent,
            ),
        data: {
            title: 'プライバシーポリシー',
        },
    },
];
