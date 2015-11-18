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
  ssl: RouteSSLSchema;
  enabled: boolean;
  desc: string;
  owner: string;
  routes: RouteRoutesSchema[];
  meta: RouteMetaSchema;
  createAt: Date;
  updateAt: Date;
};

export interface RouteSSLSchema {
  key: string;
  cert: string;
  ca: string;
};

export interface DataSchema {
  id: string;
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
      c.findOne({ _id: id }, (err, d) => {
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

interface ASSLRoute {
  host: string;
  ssl: SSL;
  createAt: Date;
  updateAt: Date;
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
      c.findOne({ _id: id }, (err, d) => {
        if (err) { cb(err, null); return; }
        cb(null, d);
      });
    })
  }
}

interface TokenSchema {
  id: string;
  username: string;
}

class Token {
  find(id: string, cb: (err: Error, d: TokenSchema) => void): void {
    database.db.collection('token', (err, c) => {
      if (err) { cb(err, null); return; }
      c.findOne({ _id: id }, (err, d) => {
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
