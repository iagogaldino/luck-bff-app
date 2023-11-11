FROM node:18-alpine

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]
# docker build -t luck-bff .