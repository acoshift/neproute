/// <reference path="typings/tsd.d.ts"/>

import * as http from "http";
import * as https from "https";
import * as tls from "tls";
import * as express from "express";
import { Request, Response } from "express";
import { Config } from "./config";
import { database, route, sslRoute, dataRoute } from "./db";
import * as api from "./api";

var config: Config = require('./config');

database.connect(config, (err, db) => {
  if (err) { console.log(err); return; }

  var app = express();

  app.use('/api', (req, res, next) => {
    if (req.hostname == 'localhost' || req.hostname == config.host) {
      next();
    }
  }, api);

  app.use((req, res, next) => {
    let { hostname, url } = req;
    route.findHost(hostname, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      if (!d) { res.sendStatus(404); return; }
      if (url.length > 1 && url.substring(url.length - 1) == '/')
        url = url.substring(0, url.length - 1);
      if (!d.routes[url]) { res.sendStatus(404); return; }
      dataRoute.find(d.routes[url], (err, d) => {
        if (err) { res.sendStatus(500); return; }
        res.send(d.data);
      });
    });
  });

  var https_options = {
    SNICallback: (host, cb) => {
      let ssl = sslRoute.get(host);
      cb(null, tls.createSecureContext({
          cert: ssl.cert,
          key: ssl.key,
          ca: ssl.ca
        }).context
      );
    },
    cert: sslRoute.default().cert,
    key: sslRoute.default().key,
    ca: sslRoute.default().ca
  };

  config.http && http.createServer(app).listen(config.http);
  config.https && https.createServer(https_options, app).listen(config.https);
});
