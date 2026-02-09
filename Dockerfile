FROM node:alpine

COPY ./src/dist /app
COPY ./src/package.json /app

WORKDIR /app

RUN npm i

VOLUME /app/modules

EXPOSE 3000

CMD ["npm", "run", "start-minified"]