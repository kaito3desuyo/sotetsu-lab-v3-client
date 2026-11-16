import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrainDiagramService } from '../services/train-diagram.service';

/**
 * 取得の口（fetchXxx）だけを差し替えた本物の TrainDiagramService を出す。
 * fetchData（取得の順序・失敗の戻し・世代の扱い）は本物をそのまま通すので、
 * component の spec が取得まわりの動きを確かめられる。
 */
export function provideTrainDiagramServiceStub(
    overrides: Partial<Record<keyof TrainDiagramService, unknown>>,
): (Provider | EnvironmentProviders)[] {
    return [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
            provide: TrainDiagramService,
            useFactory: () =>
                Object.assign(new TrainDiagramService(), overrides),
        },
    ];
}
