// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    backendUrl: '/api',
    /** 画面の URL の起点（OGP の og:url・og:image） */
    siteUrl: 'http://localhost:4200',
    socketUrl: 'ws://localhost:3021',
    analytics: {
        id: 'G-CFKSDNMCY3', // IDを設定する、environment.prod.tsにも
    },
    serviceId: '8d9d2a20-48ad-438b-83a4-ba8727b4708c',
};
