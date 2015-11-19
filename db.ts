/// <reference path="typings/tsd.d.ts"/>

import { escape } from "querystring";
import { MongoClient, Db, ObjectID } from "mongodb";
import { Config } from "./config";

export var db: Db;

export function connect(config: Config, cb: (err: Error) => void): void {
  this.config = config;
  let uri = (() => {
    let { user, pwd, host, port, db } = config.database;
    return `mongodb://${(user && pwd) ? `${user}:${escape(pwd)}@` : ''}${host || 'localhost'}:${port || 27017}/${db || 'neproute'}`;
  })();
  MongoClient.connect(uri, (err, d) => {
    db = d;
    cb(err);
  });
}

export function objectId(id: string): ObjectID {
  let _id = null;
  try {
    _id = ObjectID.createFromHexString(id);
  } catch (e) { }
  return _id;
}

export interface Timestamps {
  createAt: number,
  updateAt: number
}

export interface RouteSchema extends Timestamps {
  host: string;
  ssl: string;
  enabled: boolean;
  desc: string;
  owner: string;
  routes: RouteRoutesSchema[];
};

export interface SslSchema extends Timestamps {
  host: string;
  ssl: {
    cert: any,
    key: any,
    ca: any
  }
}

export interface DataSchema {
  id: string;
  data: any;
}

export interface DataInsertSchema {
  _id?: ObjectID;
  data: any;
}

export interface RouteRoutesSchema {
  route: string;
  data: string; // => DataSchema
};

class Route {
  findHost(host: string, cb: (err: Error, d: RouteSchema) => void): void {
    db.collection('route').findOne({ host: host }, (err, d) => {
      if (err) { cb(err, null); return; }
      cb(null, d);
    });
  }

  findId(id: string, cb: (err: Error, d: RouteSchema) => void): void {
    db.collection('route').findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
      if (err) { cb(err, null); return; }
      cb(null, d);
    });
  }

  insert(route: RouteSchema, cb: (err: Error, d) => void): void {
    db.collection('route').findOne({ host: route.host }, (err, d) => {
      if (err) { cb(err, null); return; }
      if (d) { cb(null, { ok: 0 }); return; }
      db.collection('route').insertOne(route, {w: 1}, (err) => {
        if (err) { cb(err, null); return; }
        cb(null, { ok: 1 });
      });
    });
  }

  delete(host: string, cb: (err: Error, d) => void): void {
    db.collection('route').deleteOne({ host: host }, (err, d) => {
      if (err) { cb(err, null); return; }
      cb(null, d);
    });
  }
};

class DataRoute {
  find(id: string, cb: (err: Error, d: DataSchema) => void): void {
    db.collection('data', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }

  insert(data: DataInsertSchema, cb: (err: Error, d) => void): void {
    db.collection('data', (err, c) => {
      if (err) { cb(err, null); return; }
      c.insertOne(data, {w: 1}, (err) => {
        if (err) { cb(err, null); return; }
        cb(null, { id: data._id.toHexString() });
      });
    });
  }

  delete(id: string, cb: (err: Error, d) => void): void {
    db.collection('data', (err, c) => {
      if (err) { cb(err, null); return; }
      c.deleteOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }
}

export interface TokenSchema {
  id: string;
  username: string;
}

export interface TokenInsertSchema {
  username: string;
}

class Token {
  find(id: string, cb: (err: Error, d: TokenSchema) => void): void {
    db.collection('token', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, { id: d._id, username: d.username });
      })
    });
  }

  insert(username: string, cb: (err: Error) => void): void {
    ;
  }
}

export var route = new Route();
export var dataRoute = new DataRoute();
export var token = new Token();
