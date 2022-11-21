// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    backendUrl: 'http://localhost:8000/offline/api',
    socketUrl: 'wss://lxac6g1ue7.execute-api.ap-northeast-1.amazonaws.com/Prod',
    clientId: '43t7n2as7aahnqr1vbu9de4ds9',
    analytics: {
        id: 'G-CFKSDNMCY3', // IDを設定する、environment.prod.tsにも
    },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
