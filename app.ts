/// <reference path="typings/tsd.d.ts"/>

import * as http from "http";
import * as https from "https";
import * as tls from "tls";
import * as express from "express";
import { Request, Response } from "express";
import * as ip from "ip";
import { Config } from "./config";
import { database, route, sslRoute, dataRoute } from "./db";
import * as api from "./api";

var config: Config = require('./config');

var app = express();

app.use('/api', (req, res, next) => {
  if (req.hostname == 'localhost' || req.hostname == config.host) {
    next();
  }
}, api);

app.use((req, res, next) => {
  let { hostname, url } = req;
  try {
    if (ip.isEqual(hostname, ip.address())) {
      res.send(`NepRoute https://github.com/acoshift/neproute<br>If you don't know this page, please use https://${config.host}`);
      return;
    }
  } catch(e) {}
  if (url.length > 1 && url.substring(url.length - 1) == '/')
    url = url.substring(0, url.length - 1);
  database.db.collection('route').findOne({ host: hostname, 'routes.route' : url }, [ 'host', 'enabled', 'ssl', 'routes.data' ], (err, d) => {
    if (err) { res.sendStatus(500); return; }
    if (!d || !d.enabled) { res.sendStatus(404); return; }
    if (!req.secure && d.ssl == 'prefer') {
      res.redirect(`https://${hostname + url}`);
      return;
    }
    if (req.secure && d.ssl == 'no') {
      res.redirect(`http://${hostname + url}`);
      return;
    }
    dataRoute.find(d.routes[0].data, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      res.send(d.data);
    });
  });
});

database.connect(config, (err, db) => {
  if (err) { console.log(err); return; }

  var https_options = {
    SNICallback: (host, cb) => {
      db.collection('ssl').findOne({ host: host }, (err, d) => {
        if (err) cb(null, null);
        cb(null, tls.createSecureContext({
            cert: d.ssl.cert,
            key: d.ssl.key,
            ca: d.ssl.ca
          }).context
        );
      });
    },
    cert: '',
    key: '',
    ca: ''
  };

  db.collection('ssl').findOne({ host: config.host }, (err, d) => {
    //if (d) {
      https_options.cert = d.ssl.cert || '';
      https_options.key = d.ssl.key || '';
      https_options.ca = d.ssl.ca || '';
    //}
    console.log(https_options);
    config.http && http.createServer(app).listen(config.http);
    config.https && https.createServer(https_options, app).listen(config.https);
  });
});
