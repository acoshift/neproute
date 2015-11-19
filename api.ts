/// <reference path="typings/tsd.d.ts"/>

import * as express from "express";
import { Request, Response } from "express";
import * as bodyParser from "body-parser";
import { ObjectID } from "mongodb";
import { db, route, dataRoute, token, RouteSchema, DataInsertSchema } from "./db";

// TODO: check user permission for each operator

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

api.get('/route/host/:host', (req, res) => {
  let { host } = req.params;
  db.collection('route').findOne({ host: host }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.get('/route/owner/:owner', (req, res) => {
  let { owner } = req.params;
  let { limit, skip } = req.query;
  db.collection('route').find({ owner: owner }, { limit: limit, skip: skip }).toArray((err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.get('/route/:id', (req, res) => {
  let { id } = req.params;
  db.collection('route').findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.delete('/route/:id', (req, res) => {
  let { id } = req.params;
  db.collection('route').deleteOne({ _id: ObjectID.createFromHexString(id) }, { w: 1 }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
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
