import express = require('express');
import http = require('http');
import https = require('https');
import fs = require('fs');
import path = require('path');
import tls = require('tls');
import _ = require('lodash')
import url = require('url');
var compression = require('compression');
import appConfig = require('./config');

var app = express();
app.use(compression({ level: 9 }));

/*
interface AppConfig {
  http: number;
  https: number;
  configDir: string;
  ssl: { // base64 + bundle ca
    cert: string;
    key: string;
    ca: string;
  }
}*/

function decode (base64: string): string {
  return base64 ? new Buffer(base64, 'base64').toString() : null;
}

appConfig.ssl.cert = decode(appConfig.ssl.cert);
appConfig.ssl.key = decode(appConfig.ssl.key);
appConfig.ssl.ca = decode(appConfig.ssl.ca);

var configDir = path.join(__dirname, appConfig.configDir);

interface Config {
  priority: number;
  domain: string[];
  host: string;
  port: number;
  prefix: string;
  ssl: { // store as base64 string
    cert: string;
    key: string;
    ca: string; // bundle ca
    force: boolean;
  }
}

var config: Config[] = [];

function load(fn: string): Config {
  try {
    let c: Config = JSON.parse(fs.readFileSync(fn).toString());
    if (!_.isNumber(c.priority) || !c.domain || !c.host || !c.port) return null;
    if (c.prefix && c.prefix.substr(0, 1) !== '/') c.prefix = '/' + c.prefix;
    return {
      priority: c.priority,
      domain: c.domain,
      host: c.host,
      port: c.port,
      prefix: c.prefix || '',
      ssl: c.ssl ? {
        cert: decode(c.ssl.cert),
        key: decode(c.ssl.key),
        ca: decode(c.ssl.ca),
        force: c.ssl.force || false
      } : null
    };
  } catch (e) { return null; }
}

function reloadConfig(): void {
  let nconfig = [];
  fs.readdirSync(configDir).forEach(fn => {
    let c = load(path.join(configDir, fn));
    if (!!c) nconfig.push(c);
  });
  config = nconfig;
}

var watcher = fs.watch(configDir, (event, fn) => {
  reloadConfig();
});

reloadConfig();

app.use((req, res) => {
  let u = req.hostname + req.url;
  let domain;
  let cf = _(config)
    .filter(x => _.some(x.domain, x => {
      let b = u.substr(0, Math.max(x.length, req.hostname.length)) === x;
      if (b) domain = x;
      return b;
    }))
    .sort((x, y) => x.priority - y.priority)
    .first();
  u = u.substr(domain.length);
  if (_.isEmpty(cf)) return res.sendStatus(404);
  if (cf.ssl && cf.ssl.force && !req.secure) return res.redirect(`https://${req.hostname}${req.url}`);

  let opt: http.RequestOptions = {
    protocol: 'http:',
    host: cf.host,
    port: cf.port,
    path: cf.prefix + u,
    method: req.method,
    headers: req.headers
  }

  req
    .pipe(http.request(opt, r => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res, { end: true });
    }), { end: true })
    .on('error', e => {
      res.sendStatus(500);
    });
});

var https_options: any = {
  SNICallback: (hostname, cb) => {
    let cf = _(config)
      .filter(x => _.some(x.domain, x => hostname === x.split('/')[0]))
      .sort((x, y) => x.priority - y.priority)
      .first();

    if (!cf || !cf.ssl) { cb(null, null); return; }
    let r = tls.createSecureContext({
      cert: cf.ssl.cert,
      key: cf.ssl.key,
      ca: cf.ssl.ca
    }).context;
    cb(null, r);
  },
  cert: appConfig.ssl.cert,
  key: appConfig.ssl.key,
  ca: appConfig.ssl.ca
};

http.createServer(app).listen(appConfig.http);
https.createServer(https_options, app).listen(appConfig.https);
