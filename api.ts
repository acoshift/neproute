/// <reference path="typings/tsd.d.ts"/>

import * as express from "express";
import * as bodyParser from "body-parser";
import { db, objectId, route, dataRoute, token, RouteSchema, DataInsertSchema, SslSchema } from "./db";

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

api.get('/route', (req, res) => {
  let { limit, skip } = req.query;
  db.collection('route').find({}, { limit: limit || 10, skip: skip }).toArray((err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
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
  db.collection('route').findOne({ _id: objectId(id) }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.delete('/route/:id', (req, res) => {
  let { id } = req.params;
  db.collection('route').deleteOne({ _id: objectId(id) }, { w: 1 }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.put('/route/:id', (req, res) => {
  let { id } = req.params;
  db.collection('route').findOne({ _id: objectId(id) }, (err, d: RouteSchema) => {
    if (err) { res.sendStatus(500); return; }
    if (!d) { res.sendStatus(404); return; }
    let b = req.body;
    let k: RouteSchema = {
      host: b.host || d.host,
      ssl: b.ssl || d.ssl,
      enabled: b.enabled || d.enabled,
      desc: b.desc || d.desc,
      owner: b.owner || d.owner,
      routes: b.routes || d.routes,
      createAt: d.createAt,
      updateAt: Date.now()
    };
    db.collection('route').updateOne({ _id: objectId(id) }, k, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      res.json(d);
    });
  });
});

api.post('/route', (req, res) => {
  let b = req.body;
  if (!b.host || !b.owner) { res.sendStatus(400); return; }
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
  db.collection('route').findOne({ host: d.host }, (err, k) => {
    if (err) { res.sendStatus(500); return; }
    if (k) { res.json({ ok: 0 }); return; }
    db.collection('route').insertOne(d, { w: 1 }, (err, r) => {
      if (err) { res.sendStatus(500); return; }
      r.insert = d;
      res.json(r);
    });
  });
});

api.get('/ssl', (req, res) => {
  let { limit, skip } = req.query;
  db.collection('ssl').find({}, { limit: limit || 10, skip: skip }).toArray((err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.get('/ssl/host/:host', (req, res) => {
  let { host } = req.params;
  db.collection('ssl').findOne({ host: host }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.get('/ssl/:id', (req, res) => {
  let { id } = req.params;
  db.collection('ssl').findOne({ _id: objectId(id) }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.delete('/ssl/:id', (req, res) => {
  let { id } = req.params;
  db.collection('ssl').deleteOne({ _id: objectId(id) }, { w: 1 }, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.put('/ssl/:id', (req, res) => {
  let { id } = req.params;
  db.collection('ssl').findOne({ _id: objectId(id) }, (err, d: SslSchema) => {
    if (err) { res.sendStatus(500); return; }
    if (!d) { res.sendStatus(404); return; }
    let b = req.body;
    let k: SslSchema = {
      host: b.host || d.host,
      ssl: b.ssl || d.ssl,
      createAt: d.createAt,
      updateAt: Date.now()
    };
    db.collection('ssl').updateOne({ _id: objectId(id) }, k, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      res.json(d);
    });
  });
});

api.post('/ssl', (req, res) => {
  let b = req.body;
  if (!b.host || !b.ssl || !b.ssl.cert || !b.ssl.key) { res.sendStatus(400); return; }
  let d: SslSchema = {
    host: b.host,
    ssl: {
      cert: b.ssl.cert || '',
      key: b.ssl.key || '',
      ca: b.ssl.ca || ''
    },
    createAt: Date.now(),
    updateAt: Date.now()
  };
  db.collection('ssl').findOne({ host: d.host }, (err, k) => {
    if (err) { res.sendStatus(500); return; }
    if (k) { res.json({ ok: 0 }); return; }
    db.collection('ssl').insertOne(d, { w: 1 }, (err, r) => {
      if (err) { res.sendStatus(500); return; }
      r.insert = d;
      res.json(r);
    });
  });
});

api.post('/data', (req, res) => {
  let d: DataInsertSchema = { data: null };

  if (req.body.data && req.body.data.base64)
    d.data = new Buffer(req.body.data.base64, 'base64').toString('ascii');
  else
    d.data = req.body.data;

  if (!d.data) { res.sendStatus(400); }
  dataRoute.insert(d, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.json(d);
  });
});

api.use((req, res) => {
  res.sendStatus(404);
});

export = api;
