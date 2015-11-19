/// <reference path="typings/tsd.d.ts"/>

import * as express from "express";
import { Request, Response } from "express";
import * as bodyParser from "body-parser";
import { database, route, sslRoute, dataRoute, token, RouteSchema, DataInsertSchema } from "./db";

var api = express();

api.use(bodyParser.json());

api.get('/login', (req, res) => {
  // TODO: login return token
});

api.use((req, res, next) => {
  // TODO: implement api auth
  let t = req.get('token');
  if (!t || t != 'SfXn7sGr5^j?Xt_QMv-n5v=C-ey$LPE-unza9@m6?sPcXr#97-xyW#G@V_P8&NDt!F?_r97*kKgh3#*th=D_C@YdxDe%7HzXS7MW%C99!H@u!LJW?ApCUvPShsXzgrVY') { res.sendStatus(401); return; }
  /*token.find(t, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    if (!d) { res.sendStatus(401); return; }
    req.params.token = d;
    next();
  });*/
  next();
});

api.route('/route/host/:host')
  .get((req, res) => {
    let { host } = req.params;
    route.findHost(host, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      res.json(d);
    });
  })
  .put((req, res) => {
    ;
  })
  .post((req, res) => {

  })
  .delete((req, res) => {
    ;
  });

api.get('/route/:id', (req, res) => {
  let { id } = req.params;
  route.findId(id, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.status(200).json(d);
  });
});

api.post('/route', (req, res) => {
  let b = req.body;
  let d: RouteSchema = {
    host: b.host,
    ssl: b.ssl || 'no',
    enabled: b.enabled || true,
    desc: b.desc || '',
    owner: b.owner,
    routes: b.routes || [],
    createAt: Date.now(),
    updateAt: Date.now()
  };
  route.insert(d, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.post('/data', (req, res) => {
  let d: DataInsertSchema = {
    data: req.body.data
  }
  dataRoute.insert(d, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.use((req, res) => {
  res.sendStatus(404);
});

export = api;
