import { jsonToGraphQLQuery } from './jsonToGraphQLQuery';

interface Method {
  _type: string;
  _method: string;
  _q: any;
  _alias?: string;
  _filter?: any;
  _set?: any;
  _cascade?: any;
  _first?: number;
  _order?: any;
  _offset?: number;
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
  private _cascade!: any;
  private _type!: string;
  private _alias!: string;
  private _filter!: any;
  private _set!: any;
  private _opts: any;
  private _first!: number;
  private _order!: any;
  private _offset!: number;
  private _search: Replace[] = [
    { _find: '__cascade', _replace: '__directives' },
    { _find: '__filter', _replace: '__args' },
    { _find: '__order', _replace: '__args' },
    { _find: '__offset', _replace: '__args' },
    { _find: '__first', _replace: '__args' }
  ];

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

  operation(op: string): this {
    this._operation = op;
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

  set(q: any): this {
    this._set = q;
    return this;
  }

  filter(q: any): this {
    this._filter = q;
    return this;
  }

  cascade(q: any): this {
    this._cascade = q;
    return this;
  }

  first(n: number): this {
    this._first = n;
    return this;
  }

  order(q: any): this {
    this._order = q;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  private addMethod() {

    this._methods.push({
      _method: this._method,
      _q: this._q,
      _type: this._type,
      _alias: this._alias,
      _filter: this._filter,
      _cascade: this._cascade,
      _set: this._set,
      _first: this._first,
      _order: this._order,
      _offset: this._offset
    });
    this._type = '';
    this._alias = '';
    this._filter = undefined;
    this._set = undefined;
    this._cascade = undefined;
    this._first = undefined;
    this._order = undefined;
    this._offset = undefined;
  }

  private replace(obj: any, find: string, replace: string) {
    for (const i in obj) {
      if (i === find) {
        const value = obj[i];
        const newKey = find.substring(2);
        delete obj[i];
        obj[replace] = { [newKey]: value, ...obj[replace] };
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

      // first
      if (m._first) {
        q = { __first: m._first, ...q };
      }

      // order
      if (m._order) {
        q = { __order: m._order, ...q };
      }

      // offset
      if (m._offset) {
        q = { __offset: m._offset, ...q };
      }

      // cascade
      if (m._cascade) {
        q = { __cascade: m._cascade, ...q };
      }

      // shortcuts replace
      for (const r of this._search) {
        q = this.replace(q, r._find, r._replace);
      }

      if (isUpdate || isAdd || isUpsert || isDelete) {
        q = Object.keys(q).length === 0 ? q : { [m._type]: q };
        q.numUids = 1;
      }
      if (isDelete) {
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
        if (typeof m._filter === 'string' || Array.isArray(m._filter)) {
          m._filter = { id: m._filter };
        }
        // translate to 'eq' if not id
        if (typeof m._filter === 'object') {
          if (Object.keys(m._filter).length === 1) {
            const key = Object.keys(m._filter)[0];
            if (m._filter[key] !== 'object') {
              m._filter = { [key]: { 'eq': m._filter[key] } };
            }
          }
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

// class to save and edit optimistic data
export class optimistic {

  private _data: any[] = [];

  constructor() { }

  set data(d: any) {
    this._data = d;
  }

  get data() {
    return this._data;
  }

  add(record: any, idName = 'id', addId = true) {
    if (idName && addId) {
      record = { idName: this.randString(), ...record };
    }
    this._data = [...this._data, record];
    return this;
  }

  delete(id: string, idName = 'id') {
    this._data = this._data.filter((r: any) => r[idName] !== id);
    return this;
  }

  update(id: string, record: any, idName = 'id') {
    // toggle completed task optimistically
    this._data = this._data.map((r: any) => {
      if (r[idName] === id) {
        for (const k of Object.keys(record)) {
          r[k] = record[k];
        }
      }
      return r;
    });
    return this;
  }

  private randString(): string {
    // generate random string
    return Math.random().toString(36).substr(2, 5);
  }

}