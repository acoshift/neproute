/// <reference path="typings/tsd.d.ts"/>

import { escape } from "querystring";
import { MongoClient, Db, ObjectID } from "mongodb";
import { Config } from "./config";

class Database {
  connect(config: Config, callback: (err: Error, db: Db) => void): void {
    this.config = config;
    let { user, pwd, host, port, db } = config.database;
    let uri = `mongodb://${(user && pwd) ? `${user}:${escape(pwd)}@` : ''}${host || 'localhost'}:${port || 27017}/${db || 'neproute'}`;
    MongoClient.connect(uri, (err, d) => {
      this.db = d;
      sslRoute.reload((err) => {});
      callback(err, d)
    });
  }

  db: Db;
  config: Config;
}

export var database = new Database();

export interface RouteSchema {
  host: string;
  ssl: string;
  enabled: boolean;
  desc: string;
  owner: string;
  routes: RouteRoutesSchema[];
  meta: RouteMetaSchema;
  createAt: number;
  updateAt: number;
};

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

export interface RouteMetaSchema {
  called: number;
}

class Route {
  findHost(host: string, cb: (err: Error, d: RouteSchema) => void): void {
    database.db.collection('route', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ host: host }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }

  findId(id: string, cb: (err: Error, d: RouteSchema) => void): void {
    database.db.collection('route', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }

  insert(route: RouteSchema, cb: (err: Error, d) => void): void {
    database.db.collection('route', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ host: route.host }, (err, d) => {
        if (err) { cb(err, null); return; }
        if (d) { cb(null, { ok: 0 }); return; }
        c.insertOne(route, {w: 1}, (err) => {
          if (err) { cb(err, null); return; }
          cb(null, { ok: 1 });
        });
      });
    });
  }

  delete(host: string, cb: (err: Error, d) => void): void {
    database.db.collection('route', (err, c) => {
      if (err) { cb(err, null); return; }
      c.deleteOne({ host: host }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }
};

export interface SSL {
  cert: any;
  key: any;
  ca: any;
}

export interface ASSLRoute {
  host: string;
  ssl: SSL;
  createAt: number;
  updateAt: number;
}

class SSLRoute {
  _ssls = [];

  reload(cb): void {
    database.db.collection('ssl', (err, c) => {
      if (err) { cb(err); return; }
      c.find().toArray((err, ds) => {
        if (err) { cb(err); return; }
        this._ssls = [];
        ds.forEach((x) => { if (x.host) this._ssls[x.host] = x.ssl })
        cb(null);
      });
    });
  }

  get(host: string): SSL {
    return this._ssls[host];
  }

  default(): SSL {
    return this._ssls[database.config.host] || { cert: '', key: '', ca: '' };
  }
}

class DataRoute {
  find(id: string, cb: (err: Error, d: DataSchema) => void): void {
    database.db.collection('data', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ _id: ObjectID.createFromHexString(id) }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    });
  }

  insert(data: DataInsertSchema, cb: (err: Error, d) => void): void {
    database.db.collection('data', (err, c) => {
      if (err) { cb(err, null); return; }
      c.insertOne(data, {w: 1}, (err) => {
        if (err) { cb(err, null); return; }
        cb(null, { id: data._id.toHexString() });
      });
    });
  }

  delete(id: string, cb: (err: Error, d) => void): void {
    database.db.collection('data', (err, c) => {
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
    database.db.collection('token', (err, c) => {
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
export var sslRoute = new SSLRoute();
export var dataRoute = new DataRoute();
export var token = new Token();
