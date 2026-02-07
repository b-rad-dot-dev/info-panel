FROM node:alpine

COPY ./src /app
WORKDIR /app
VOLUME /app/modules

RUN npm i

EXPOSE 3000

CMD ["npm", "start"]