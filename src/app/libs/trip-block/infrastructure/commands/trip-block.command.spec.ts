import {
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { TripBlockCommand } from './trip-block.command';

const v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';

function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withXhr(), withInterceptorsFromDi()),
            provideHttpClientTesting(),
        ],
    });
    return {
        command: TestBed.inject(TripBlockCommand),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('TripBlockCommand', () => {
    it('createMany の応答の本文が null のときは、builder に通さず null を返す', () => {
        const { command, controller } = setup();
        let result: unknown = undefined;

        command.createMany([]).subscribe((v) => (result = v));
        controller.expectOne(`${v3ApiUrl}/bulk`).flush(null);

        expect(result).toBeNull();
        controller.verify();
    });

    it('replaceOne の応答の本文が null のときは、builder に通さず null を返す', () => {
        const { command, controller } = setup();
        let result: unknown = undefined;

        command
            .replaceOne('b1', { tripBlockId: 'b1', trips: [] })
            .subscribe((v) => (result = v));
        controller.expectOne(`${v3ApiUrl}/b1`).flush(null);

        expect(result).toBeNull();
        controller.verify();
    });

    it('addTripToTripBlock の応答の本文が null のときは、builder に通さず null を返す', () => {
        const { command, controller } = setup();
        let result: unknown = undefined;

        command
            .addTripToTripBlock('b1', { tripId: 't1' })
            .subscribe((v) => (result = v));
        controller.expectOne(`${v3ApiUrl}/b1/add-trip`).flush(null);

        expect(result).toBeNull();
        controller.verify();
    });

    it('deleteTripFromTripBlock の応答の本文が null のときは、builder に通さず null を返す', () => {
        const { command, controller } = setup();
        let result: unknown = undefined;

        command
            .deleteTripFromTripBlock('b1', {
                tripId: 't1',
                holdAsAnotherTripBlock: false,
            })
            .subscribe((v) => (result = v));
        controller.expectOne(`${v3ApiUrl}/b1/delete-trip`).flush(null);

        expect(result).toBeNull();
        controller.verify();
    });
});
