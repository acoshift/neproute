/// <reference path="typings/tsd.d.ts"/>

import * as express from "express";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as tls from "tls";

var app = express();

interface AppConfig {
  http: number;
  https: number;
  configDir: string;
  ssl: { // base64 + bundle ca
    cert: string;
    key: string;
    ca: string;
  }
}

function decode (base64: string): string {
  return base64 ? new Buffer(base64, 'base64').toString() : null;
}

var appConfig: AppConfig = require('./config');

appConfig.ssl.cert = decode(appConfig.ssl.cert);
appConfig.ssl.key = decode(appConfig.ssl.key);
appConfig.ssl.ca = decode(appConfig.ssl.ca);

var configDir = path.join(__dirname, appConfig.configDir);

interface Config {
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
    if (!c.domain || !c.host || !c.port) return null;
    return {
      domain: c.domain,
      host: c.host,
      port: c.port,
      prefix: c.prefix || '',
      ssl: (() => {
        return c.ssl ? {
          cert: decode(c.ssl.cert),
          key: decode(c.ssl.key),
          ca: decode(c.ssl.ca),
          force: c.ssl.force || false
        } : null;
      })()
    };
  } catch (e) { return null; }
}

function reloadConfig(): void {
  let nconfig = [];
  fs.readdirSync(configDir).forEach((fn) => {
    let c = load(path.join(configDir, fn));
    if (c) nconfig.push(c);
  });
  config = nconfig;
}

var watcher = fs.watch(configDir, (event, fn) => {
  reloadConfig();
});

reloadConfig();

app.use((req, res, next) => {
  let k = config.filter((x) => {
    return x.domain.some((x) => x === req.hostname + req.url || x === req.hostname);
  });
  if (!k[0]) return res.sendStatus(400);
  if (k[0].ssl && k[0].ssl.force && !req.secure) return res.redirect(`https://${req.hostname}${req.url}`);

  let opt: http.RequestOptions = {
    host: k[0].host,
    port: k[0].port,
    path: k[0].prefix + req.url,
    method: req.method,
    headers: req.headers
  }

  req.pipe(http.request(opt, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, { end: true });
  }), { end: true }).on('error', (e) => {
    res.sendStatus(500);
  });
});

var https_options = {
  SNICallback: (host, cb) => {
    let k = config.filter((x) => {
      return x.domain.some((x) => x == host);
    });
    if (!k[0] || !k[0].ssl) { cb(null, null); return; }
    let r = tls.createSecureContext({
      cert: k[0].ssl.cert,
      key: k[0].ssl.key,
      ca: k[0].ssl.ca
    }).context;
    cb(null, r);
  },
  cert: appConfig.ssl.cert,
  key: appConfig.ssl.key,
  ca: appConfig.ssl.ca
};

http.createServer(app).listen(appConfig.http);
https.createServer(https_options, app).listen(appConfig.https);
