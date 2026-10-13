import { Pipe, PipeTransform } from '@angular/core';

/** 0 時からの秒を `HH:mm` にする。86400 以上（2 日目）は 24 時間を引く */
@Pipe({ name: 'secondsToHhmm' })
export class SecondsToHhmmPipe implements PipeTransform {
    transform(seconds: number): string {
        const minutes = Math.floor((seconds % 86400) / 60);
        const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mm = String(minutes % 60).padStart(2, '0');
        return `${hh}:${mm}`;
    }
}
