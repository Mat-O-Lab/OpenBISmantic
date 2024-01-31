import {Component} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [CookieService]
})
export class LoginComponent {
  waiting: Array<(value: unknown) => void> = [];

  constructor(private cookieService: CookieService) {
  }

  async login(username: string, password: string, setCookie: boolean = false) {
    const loginEndpoint = new URL('/openbis/openbis/rmi-application-server-v3.json', document.baseURI);
    const response = await fetch(loginEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        id: '2',
        jsonrpc: '2.0',
        method: 'login',
        params: [username, password]
      })
    });
    const token = (await response.json()).result;
    if (token && setCookie) {
      this.cookieService.set('openbis', token, undefined, '/');
    }
    return token;
  }

  submit(ev: SubmitEvent) {
    const usernameElem = document.getElementById('login_user') as HTMLInputElement;
    const username = usernameElem.value;
    const passwordElem = document.getElementById('login_password') as HTMLInputElement;
    const password = passwordElem.value;
    const setCookie: boolean = (document.getElementById('login_set_cookie') as HTMLInputElement).checked;
    passwordElem.classList.remove('is-invalid');
    this.login(username, password, setCookie).then(token => {
      if (token) {
        for (let resolve of this.waiting) {
          resolve(true);
        }
        this.waiting = [];
      } else {
        passwordElem.classList.add('is-invalid');
      }
    });
    ev.preventDefault();
  }

  await() {
    return new Promise((resolve, reject) => {
      this.waiting.push(resolve);
    });
  }
}
