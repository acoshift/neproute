/// <reference path="typings/tsd.d.ts"/>

import * as express from "express";
import { Request, Response } from "express";
import * as bodyParser from "body-parser";
import { database, route, sslRoute, dataRoute, token } from "./db";

var api = express();

api.use(bodyParser.json());

// TODO: api auth
function apiAuth(req: Request, res: Response, next: Function) {
  console.log('auth ' + req.get('token'));
  res.sendStatus(401);
  next();
}

api.get('/login', (req, res) => {
  ;
});

api.route('/route/host/:host')
  .all(apiAuth)
  .get((req, res) => {
    let { host } = req.params;
    route.findHost(host, (err, d) => {
      if (err) { res.sendStatus(500); return; }
      res.status(200).json(d);
    });
  })
  .put((req, res) => {
    ;
  })
  .post((req, res) => {
    ;
  })
  .delete((req, res) => {
    ;
  });

api.get('/route/id/:id', (req, res) => {
  let { id } = req.params;
  route.findId(id, (err, d) => {
    if (err) { res.sendStatus(500); return; }
    res.status(200).json(d);
  });
});

api.post('/route', (req, res) => {
  res.json(req.body);
});

api.use((req, res) => {
  res.sendStatus(404);
});

export = api;
