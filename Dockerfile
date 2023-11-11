FROM node:18-alpine

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

EXPOSE 3000

CMD ["npm", "npm run start"]
# docker build -t luck-bff .