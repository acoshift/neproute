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
app.disable('x-powered-by');
app.use(compression({ level: 9 }));

/*
interface AppConfig {
  http: number;
  https: number;
  ssl: {
    cert: string; // base64
    key: string; // base64
    ca: string; // bundle ca, base64
  },
  db: {
    host: string;
    port: number;
    ns: string;
    token: string; // base64
  }
}*/

function decode (base64: string): string {
  return base64 ? new Buffer(base64, 'base64').toString() : null;
}

appConfig.ssl.cert = decode(appConfig.ssl.cert);
appConfig.ssl.key = decode(appConfig.ssl.key);
appConfig.ssl.ca = decode(appConfig.ssl.ca);
appConfig.db.token = decode(appConfig.db.token);

interface Config {
  priority: number;
  domain: string[];
  host: string;
  port: number;
  prefix: string;
  enabled: boolean;
  ssl: { // store as base64 string
    cert: string;
    key: string;
    ca: string; // bundle ca
    force: boolean;
  }
}

var configs: Config[] = [];
var etag = '';

function load(c: Config): Config {
  try {
    if (!_.isNumber(c.priority) || !c.domain || !c.host || !c.port || !c.enabled) return null;
    if (c.prefix && c.prefix.substr(0, 1) !== '/') c.prefix = '/' + c.prefix;
    return {
      priority: c.priority,
      domain: c.domain,
      host: c.host,
      port: c.port,
      prefix: c.prefix || '',
      enabled: c.enabled || false,
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
  let opt: http.RequestOptions = {
    protocol: 'http:',
    host: appConfig.db.host,
    port: appConfig.db.port,
    path: '/' + appConfig.db.ns,
    method: 'POST',
    headers: {
      'Content-Type': 'application/nepq',
      'Authorization': 'Bearer ' + appConfig.db.token,
      'If-None-Match': etag
    }
  }
  let req = http.request(opt, res => {
    let data = [];
    res.on('data', d => {
      data.push(d);
    }).on('end', () => {
      if (res.statusCode !== 200) return;
      try {
        let cfs: Config[] = JSON.parse(Buffer.concat(data).toString('utf8'));
        let nconfig: Config[] = [];
        cfs.forEach(x => {
          let c = load(x);
          if (c) nconfig.push(c);
        });
        configs = _.sortBy(nconfig, 'priority');
        etag = res.headers['etag'];
      } catch(e) {}
    });
  });
  req.on('error', () => {});
  req.write('list configs');
  req.end();
}

setInterval(reloadConfig, appConfig.interval);

reloadConfig();

app.use((req, res) => {
  let u = req.hostname + req.url;
  let domain;
  let cf = _(configs).find(x => _.some(x.domain, x => {
    let b = u.split('/').slice(0, x.split('/').length).join('/') === x;
    if (b) domain = x;
    return b;
  }));

  if (_.isEmpty(cf)) return res.sendStatus(404);
  if (cf.ssl && cf.ssl.force && !req.secure) return res.redirect(`https://${req.hostname}${req.url}`);

  u = u.substr(domain.length);

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
    let cf = _(configs).find(x => _.some(x.domain, x => hostname === x.split('/')[0]));

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
