import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {firstValueFrom} from "rxjs";

@Injectable({providedIn: 'root'})
export class ConfigService {
  config: any = null;
  constructor(private http: HttpClient) {

  }

  async loadConfig()  {
    await firstValueFrom(this.http.get('/assets/config.json')).then(result => {
      this.config = result;
      return this.config;
    })
    console.log('loaded config', this.config)
  }
}
