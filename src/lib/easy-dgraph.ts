import { jsonToGraphQLQuery } from './jsonToGraphQLQuery';

interface Method {
  _type: string;
  _method?: string;
  _q?: any;
  _alias?: string;
  _filter?: any;
  _set?: any;
  _remove?: any;
  _cascade?: any;
  _first?: number;
  _order?: any;
  _offset?: number;
  _upsert?: boolean;
  _idField?: string;
};

interface Replace {
  _find: string;
  _replace: string;
}

export class Dgraph {

  _operation = 'query';
  private _methods: Method[] = [];
  private _currentMethod: Method;
  private _opts: any = {};
  private _search: Replace[] = [
    { _find: '__cascade', _replace: '__directives' },
    { _find: '__filter', _replace: '__args' },
    { _find: '__order', _replace: '__args' },
    { _find: '__offset', _replace: '__args' },
    { _find: '__first', _replace: '__args' },
    { _find: '__set', _replace: '__args' },
    { _find: '__remove', _replace: '__args' }
  ];

  constructor(_type?: string) {
    if (_type) {
      this.type(_type);
    }
  }

  toGQL(q: any) {
    return jsonToGraphQLQuery(q, this._opts);
  }

  type(type: string, alias?: string): this {
    if (this._currentMethod) {
      // add last method
      this.addMethod();
    }
    this._currentMethod = {
      _type: type,
      _idField: 'id'
    };
    if (alias) {
      this._currentMethod._alias = alias;
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
    return this;
  }

  idField(id: string): this {
    this._currentMethod._idField = id;
    return this;
  }

  get(q: any): this {
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'get';
    return this;
  }

  aggregate(q: any): this {
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'aggregate';
    return this;
  }

  query(q: any): this {
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'query';
    return this;
  }

  add(q?: any): this {
    this._operation = 'mutation';
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'add';
    return this;
  }

  upsert(q?: any): this {
    this._currentMethod._upsert = true;
    return this.add(q);
  }

  update(q?: any): this {
    this._operation = 'mutation';
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'update';
    return this;
  }

  delete(q?: any): this {
    this._operation = 'mutation';
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'delete';
    return this;
  }

  customQuery(q?: any): this {
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'custom';
    return this;
  }

  customMutation(q?: any): this {
    this._operation = 'mutation';
    this._currentMethod._q = q || {};
    this._currentMethod._method = 'custom';
    return this;
  }

  set(q: any): this {
    this._currentMethod._set = q;
    return this;
  }

  remove(q: any): this {
    this._currentMethod._remove = q;
    return this;
  }

  filter(q: any): this {
    this._currentMethod._filter = q;
    return this;
  }

  cascade(..._fields: any): this {
    _fields = _fields.length
      ? { fields: [].concat(_fields) }
      : true;

    this._currentMethod._cascade = _fields;
    return this;
  }

  first(n: number): this {
    this._currentMethod._first = n;
    return this;
  }

  order(q: any): this {
    this._currentMethod._order = q;
    return this;
  }

  offset(n: number): this {
    this._currentMethod._offset = n;
    return this;
  }

  private addMethod() {

    // add method to be created, reset
    this._methods.push(this._currentMethod);
    this._currentMethod = undefined;
  }

  private replace(obj: any, find: string, replace: string) {

    // replace methods with argument or directive in code
    for (const i in obj) {
      if (i === find) {

        let value = obj[i];
        const newKey = find.substring(2);

        // cascade fix
        if (find === '__cascade' && Array.isArray(value)) {
          value = value.length
            ? { fields: [].concat(value) }
            : true;
        }

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

  private addShortcuts(q: any, m: Method): any {

    // add shortcuts from methods to code
    for (const s of this._search) {
      const key = s._find;
      const methodKey = key.substring(1);
      if (m?.[methodKey]) {
        q = { [key]: m[methodKey], ...q };
      }
    }
    return q;
  }

  private autoId(m: Method) {

    // allow just ids to be added
    if (m._filter) {
      if (typeof m._filter === 'string' || Array.isArray(m._filter)) {
        m._filter = {
          [m._idField]: m._filter
        }
      }
    }
    return m;
  }

  build(): any {

    // add last method
    this.addMethod();

    const obj: any = {};

    for (let m of this._methods) {

      // simplify ids
      m = this.autoId(m);

      // add shortcuts
      let q: any = this.addShortcuts(m._q, m);

      // replace all shortcuts
      for (const r of this._search) {
        q = this.replace(q, r._find, r._replace);
      }

      const isUpdate = m._method === 'update';
      const isAdd = m._method === 'add';
      const isGet = m._method === 'get';
      const isDelete = m._method === 'delete';

      const patch: any = {};

      // filter
      if (q.__args?.filter) {

        // Get - Add - Update
        if (isGet) {
          q.__args = q.__args.filter;
          delete q.__args.filter;
        }
        if (isUpdate) {
          patch.filter = q.__args.filter;
          delete q.__args.filter;
        }
      }

      // set
      if (q.__args?.set) {

        // Add - Update
        if (isAdd) {
          q.__args.input = q.__args.set;
          if (m._upsert) {
            q.__args.upsert = true;
          }
        }
        if (isUpdate) {
          patch.set = q.__args.set;
        }
        delete q.__args.set;
      }

      // remove
      if (q.__args?.remove) {
        patch.remove = q.__args.remove;
        delete q.__args.remove;
      }

      // patch
      if (isUpdate) {
        q = { ...q };
        q.__args = {};
        q.__args.input = patch;
      }

      if (isUpdate || isAdd || isDelete) {

        // set up return type
        for (const v of Object.keys(q)) {
          if (!v.startsWith('__')) {
            const key = v;
            delete q[key];
            q[m._type] = {};
            q[m._type][key] = 1;
          }
        }
        q.numUids = 1;

        if (isDelete) {
          q.msg = 1;
        }
      }

      // type
      let key = m._method + this.titleType(m._type);

      // alias
      if (m._alias) {
        key = m._alias;
        q.__aliasFor = m._method + this.titleType(m._type);
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
      record = { [idName]: this.randString(), ...record };
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