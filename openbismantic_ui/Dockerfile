FROM node:20-alpine as builder

RUN mkdir /app
WORKDIR /app

RUN apk add bash jq
RUN npm install -g @angular/cli

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN ng build --configuration production --base-href /openbismantic/ui/

ENV DEV_SERVER=1

# CMD ["ng", "serve", "-c", "development", "--host", "0.0.0.0", "--port", "80", "--serve-path", "/openbismantic/ui/", "--disable-host-check", "--live-reload=false"]
ENTRYPOINT /app/entrypoint.sh

FROM nginx:latest AS production

RUN apt-get update && apt-get install -y jq

COPY openbismantic_ui.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/openbismantic_ui/browser /usr/share/nginx/html/openbismantic/ui
COPY src/assets/config.json /app/src/assets/config.json
COPY entrypoint.sh /entrypoint.sh

# ENTRYPOINT /entrypoint.sh
EXPOSE 80
