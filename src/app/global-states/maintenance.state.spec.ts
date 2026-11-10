import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { environment } from 'src/environments/environment';
import { MaintenanceState } from './maintenance.state';

describe('MaintenanceState', () => {
    let state: InstanceType<typeof MaintenanceState>;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        state = TestBed.inject(MaintenanceState);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('取れたらメンテ中かどうかを持つ', async () => {
        const done = lastValueFrom(state.fetch());
        http.expectOne(environment.backendUrl + '/maintenance').flush({
            isMaintenance: true,
        });
        await done;

        expect(state.isMaintenance()).toBe(true);
    });

    // interceptor を通らないので、ここで直さないと HttpErrorResponse のまま
    // ガードから NavigationError に乗り、GA に [object Object] と残る
    it('通信に失敗したら FetchError にして投げる', async () => {
        const done = lastValueFrom(state.fetch());
        http.expectOne(environment.backendUrl + '/maintenance').error(
            new ProgressEvent('error'),
            { status: 0 },
        );

        await expect(done).rejects.toBeInstanceOf(FetchError);
        await expect(done).rejects.toMatchObject({ statusCode: 0 });
    });
});
