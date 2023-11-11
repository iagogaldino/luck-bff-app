FROM node:18-alpine

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

EXPOSE 3000

CMD ["npm", "npm start"]
# docker build -t luck-bff .