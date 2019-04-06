import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatRadioChange, MatDialog, MatSnackBar } from '@angular/material';
import { HttpClient } from '@angular/common/http';
import * as moment from 'moment';
import * as _ from 'lodash';
import { ExceptionDialogComponent } from '../../exception-dialog/exception-dialog.component';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-add-operation-sighting-form',
  templateUrl: './add-operation-sighting-form.component.html',
  styleUrls: ['./add-operation-sighting-form.component.scss']
})
export class AddOperationSightingFormComponent implements OnInit {
  sendDataSet = this.fb.group({
    vehicleNumber: ['', Validators.required],
    operationNumber: ['', Validators.required],
    isInput: [false, Validators.required],
    sightingTime: ['', Validators.required]
  });

  @Output() send: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialog: MatDialog,
    public snackBar: MatSnackBar,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.sendDataSet.get('sightingTime').disable();
  }

  onChangeSightingTimeSelectRadioButton(event: MatRadioChange) {
    console.log(event);
    if (event.value) {
      this.sendDataSet.get('sightingTime').enable();
    } else {
      this.sendDataSet.get('sightingTime').disable();
    }
  }

  // 送信時
  onSubmit() {
    console.log('ON SUBMIT');

    Promise.resolve()
      .then(() => {
        return new Promise((resolve, reject) => {
          // 車両の存在チェック
          this.api
            .getVehicleByNumber(this.sendDataSet.get('vehicleNumber').value)
            .subscribe(result => {
              console.log(result);
              if (result['length'] !== 0) {
                resolve({
                  formationId: result[0].vehicle_formations[0].formation.id
                });
              } else {
                reject({
                  title: 'エラー',
                  text: '入力された車両番号は存在しません。'
                });
              }
            });
        });
      })
      .then(object => {
        return new Promise((resolve, reject) => {
          // 「当日」を判定する
          const today = moment();

          if (Number(moment().format('H')) < 3) {
            today.subtract(1, 'days');
          }
          // 運用番号の存在チェック
          this.api
            .getOperationByDateByNumber(
              today.format('YYYYMMDD'),
              this.sendDataSet.get('operationNumber').value
            )
            .subscribe(result => {
              if (result) {
                object['operationId'] = result['id'];
                resolve(object);
              } else {
                reject({
                  title: 'エラー',
                  text: '入力された運用番号は存在しません。'
                });
              }
            });
        });
      })
      .then(object => {
        return new Promise((resolve, reject) => {
          // 時刻
          let time: moment.Moment;
          if (this.sendDataSet.get('isInput').value) {
            time = moment(this.sendDataSet.get('sightingTime').value, 'hh:mm');
          } else {
            time = moment();
          }
          if (moment() < time) {
            reject({
              title: 'エラー',
              text: '未来の時刻を入力することはできません。'
            });
          } else {
            object['sightingTime'] = time;
            resolve(object);
          }
        });
      })
      .then(object => {
        return new Promise((resolve, reject) => {
          this.api.postOperationSightings(object).subscribe(
            result => {
              this.snackBar.open('目撃の投稿が完了しました。', 'OK', {
                duration: 3000
              });
              this.sendDataSet.reset();
              this.sendDataSet.get('isInput').setValue(false);
              this.sendDataSet.get('sightingTime').disable();
              this.send.emit();
            },
            err => {
              reject({
                title: err.error.message.title,
                text: err.error.message.text
              });
            }
          );
        });
      })
      .catch(err => {
        const dialogRef = this.dialog.open(ExceptionDialogComponent, {
          width: '480px',
          data: {
            title: err.title,
            text: err.text
          }
        });
      });
  }
}
