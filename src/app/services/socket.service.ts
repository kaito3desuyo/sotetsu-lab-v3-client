import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private url = environment.socketUrl;
  // private url = 'https://api.sotetsu-lab.com/';
  private socket: any;

  constructor() {}

  connect(queryString: string) {
    this.socket = io(this.url, {
      transports: ['websocket'],
      query: queryString
    });
  }

  emit(emitName: string, data?: any) {
    this.socket.emit(emitName, data);
  }

  broadcastEmit(emitName: string, data?: any) {
    this.socket.broadcast.emit(emitName, data);
  }

  on(onName: string) {
    const observable = new Observable(observer => {
      this.socket.on(onName, data => {
        observer.next(data);
      });

      return () => {
        this.socket.disconnect();
      };
    });
    return observable;
  }
}
