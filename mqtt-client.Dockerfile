FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

COPY src/mqtt/mqttClient.js /app/src/mqtt/

CMD ["node", "src/mqtt/mqttClient.js"]
