import { jsonToGraphQLQuery } from 'json-to-graphql-query';

interface Method {
  _type: string;
  _method: string;
  _q: any;
  _alias?: string;
  _filter?: any;
  _set?: any;
};

interface Replace {
  _find: string;
  _replace: string;
}

export class Dgraph {

  _operation = 'query';
  private _operationSet = false;
  private _methods: Method[] = [];
  private _method!: string;
  private _q!: any;
  private _type!: string;
  private _alias!: string;
  private _filter!: any;
  private _set!: any;
  private _opts: any;
  private _search: Replace[] = [
    { _find: '__cascade', _replace: '__directives' },
    { _find: '__filter', _replace: '__args' },
    { _find: '__order', _replace: '__args' },
    { _find: '__offset', _replace: '__args' },
    { _find: '__first', _replace: '__args' }
  ]

  constructor(type?: string) {
    if (type) {
      this._type = type;
    }
    this._opts = {};
  }

  toGQL(q: any) {
    return jsonToGraphQLQuery(q, this._opts);
  }

  type(type: string, alias?: string): this {
    if (this._type) {
      this.addMethod();
    }
    this._type = type;
    if (alias) {
      this._alias = alias;
    }
    return this;
  }

  options(opts: any): this {
    this._opts = { ...this._opts, ...opts };
    return this;
  }

  pretty(): this {
    this._opts.pretty = true;
    return this;
  }

  operation(operation: string): this {
    this._operation = operation;
    this._operationSet = true;
    return this;
  }

  get(q: any): this {
    this._q = q;
    this._method = 'get';
    return this;
  }

  aggregate(q: any): this {
    this._q = q;
    this._method = 'aggregate';
    return this;
  }

  query(q: any): this {
    this._q = q;
    this._method = 'query';
    return this;
  }

  add(q?: any, upsert = false): this {
    if (!this._operationSet) {
      this._operation = 'mutation';
    }
    this._q = q || {};
    this._method = upsert ? 'upsert' : 'add';
    return this;
  }

  upsert(q?: any): this {
    return this.add(q, true);
  }

  update(q?: any): this {
    if (!this._operationSet) {
      this._operation = 'mutation';
    }
    this._q = q || {};
    this._method = 'update';
    return this;
  }

  delete(q?: any): this {
    if (!this._operationSet) {
      this._operation = 'mutation';
    }
    this._q = q || {};
    this._method = 'delete';
    return this;
  }

  customQuery(q?: any): this {
    this._q = q || {};
    this._method = 'custom';
    return this;
  }

  customMutation(q?: any): this {
    if (!this._operationSet) {
      this._operation = 'mutation';
    }
    this._q = q || {};
    this._method = 'custom';
    return this;
  }

  set(q: any) {
    this._set = q;
    return this;
  }

  filter(q: any) {
    this._filter = q;
    return this;
  }

  private addMethod() {

    this._methods.push({
      _method: this._method,
      _q: this._q,
      _type: this._type,
      _alias: this._alias,
      _filter: this._filter,
      _set: this._set
    });
    this._type = '';
    this._alias = '';
    this._filter = undefined;
    this._set = undefined;
  }

  private replace(obj: any, find: string, replace: string) {
    for (const i in obj) {
      if (i === find) {
        let value = obj[i];
        if (typeof value !== 'object') {
          value = true;
        }
        const newKey = find.substring(2);
        delete obj[i];
        obj[replace] = { [newKey]: value };
      } else if (typeof obj[i] === 'object') {
        obj[i] = this.replace(obj[i], find, replace);
      }
    }
    return obj;
  }

  private titleType(type: string): string {
    return type.charAt(0).toUpperCase()
      + type.substr(1).toLowerCase();
  }

  build(): any {

    this.addMethod();

    const obj: any = {};

    for (const m of this._methods) {

      const isUpdate = m._method === 'update';
      const isUpsert = m._method === 'upsert';
      const isAdd = m._method === 'add';
      const isDelete = m._method === 'delete';

      let q: any = m._q;

      // shortcuts replace
      for (const r of this._search) {
        q = this.replace(q, r._find, r._replace);
      }

      if (isUpdate || isAdd || isUpsert || isDelete) {
        q = Object.keys(q).length === 0 ? q : { [m._type]: q };
        q.numUids = 1;
      }
      if (isUpsert || isAdd || isDelete) {
        q.msg = 1;
      }

      let key = m._method + this.titleType(m._type);

      const patch: any = {};

      // alias
      if (m._alias) {
        key = m._alias;
        q.__aliasFor = m._method + this.titleType(m._type);
      }
      // filter
      if (m._filter) {
        if (typeof m._filter === 'string') {
          m._filter = { id: m._filter };
        }
        if (isUpdate) {
          patch.filter = m._filter;
        } else {
          q.__args = {};
          q.__args.filter = m._filter;
        }
      }
      // set
      if (m._set) {
        if (isAdd || isUpsert) {
          if (!q.__args) {
            q.__args = {};
          }
          q.__args.input = m._set;
          if (isUpsert) {
            q.__args.upsert = true;
          }
        }
        if (isUpdate) {
          patch.set = m._set;
          if (!q.__args) {
            q.__args = {};
          }
          q.__args.input = patch;
        }
      }
      obj[key] = q;
    }

    return jsonToGraphQLQuery({
      [this._operation]: obj
    }, this._opts).split(' (').join('(');
  }

  buildSubscription(): any {
    this.operation('subscription');
    return this.build();
  }

}