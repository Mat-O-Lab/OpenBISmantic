FROM node:20-alpine as builder

RUN mkdir /app
WORKDIR /app

RUN npm install -g @angular/cli

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN ng build --configuration production --base-href /openbismantic/ui/

CMD ["ng", "serve", "-c", "development", "--host", "0.0.0.0", "--port", "80", "--serve-path", "/openbismantic/ui/", "--disable-host-check", "--live-reload=false"]

FROM nginx:latest AS production

COPY openbismantic_ui.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/openbismantic_ui/browser /usr/share/nginx/html/openbismantic/ui
EXPOSE 80
