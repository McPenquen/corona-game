require('dotenv').config();

import Koa from 'koa';
import bodyParser from "koa-bodyparser";
import json from 'koa-json';
import logger from "koa-logger";
import mongoose from 'mongoose';
import {exit} from 'process';
import {router} from './game/routes';
import {influxMonitoring} from './middleware/monitoring';

const views = require('koa-views');

(async function() {
  const app = new Koa();

  if (process.env.INFLUXDB_URI) {
    app.use(influxMonitoring(process.env.INFLUXDB_URI, 'corona_be_http', process.env.ENV));
  }
  app.use(json());
  app.use(logger());
  app.use(bodyParser({jsonLimit: '5mb'}));
  app.use(views(__dirname + '/game/views', {
    map: {
      html: 'handlebars',
    },
  }));
  app.use(router.routes()).use(router.allowedMethods());


  await mongoose.connect(String(process.env.MONGO_URI), {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch(() => {
    console.error('MongoDB not connected');
    exit(1);
  });
  console.log(`MongoDB connected at ${process.env.MONGO_URI}`);

  app.listen(process.env.PORT, () => {
    console.log(`⚡️Server is running at http://localhost:${process.env.PORT}`);

    // TODO temporary termination for tests before full env on CircleCI is set up
    if (process.env.TERMINATE) {
      console.log('Exiting due to TERMINATE flag')
      exit();
    }
  });
})().catch(console.error);
