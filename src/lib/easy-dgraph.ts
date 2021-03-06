import { jsonToGraphQLQuery } from './jsonToGraphQLQuery';

interface Replace {
  _find: string;
  _replace: string;
}

interface Deep {
  field: string;
  type: string;
  idField?: string;
  idType?: boolean;
  idDirective?: boolean;
}
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
  _deep?: Deep[];
  _offset?: number;
  _upsert?: boolean;
  _idField?: string;
  _prefix?: string;
};

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

  private reset() {
    this._currentMethod = undefined;
    this._methods = [];
    this._opts = [];
    this._operation = 'query';
  }

  toGQL(q: any) {
    return jsonToGraphQLQuery(q, this._opts);
  }

  type(type: string, alias?: string, prefix?: string): this {
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
    if (prefix) {
      this._currentMethod._prefix = prefix;
    }
    return this;
  }

  prefix(prefix: string) {
    this._currentMethod._prefix = prefix;
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

  deep(data: Deep | Deep[]): this {
    this._currentMethod._deep = Array.isArray(data)
      ? data
      : [].concat(data);
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
    if (Array.isArray(_fields[0])) {
      _fields = _fields[0];
    }
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

    const current = this._currentMethod;

    // prefix
    current._type =
      current._prefix
        ? current._prefix + current._type
        : current._type;

    const deep = current._deep;
    const set = current._set;
    //const delete = current._del

    // deep mutations
    if (deep) {

      for (const d of deep) {

        // add or update items
        if (set) {

          let subsets = set[d.field];
          subsets = Array.isArray(subsets)
            ? subsets
            : [].concat(subsets);

          const id = d.idField ? d.idField : 'id';
          for (const i in subsets) {
            if (subsets[i][id]) {

              // get id, remove it
              const newId = subsets[i][id];
              delete subsets[i][id];

              // @id or ID
              const filter = d.idDirective
                ? { [id]: { eq: newId } }
                : { [id]: newId };

              // create new method for each node
              const m: Method = {
                _type: d.type,
                _method: 'update',
                _q: {},
                _filter: filter,
                _set: subsets[i],
                _alias: 'update' + this.titleType(d.type) + i
              };
              this._methods.push(m);

              // delete field for add
              delete subsets[i];
            }
          }
          // filter empty items
          subsets = subsets.filter((e: any) => e);
          if (subsets.length) {
            set[d.field] = subsets;
          } else {
            delete set[d.field];
          }
        }
      }
    }
    // add method to be created, reset
    this.set(set);
    this._methods.push(current);
    this._currentMethod = undefined;
  }

  private replace(obj: any, find: string, replace: string) {

    // replace methods with argument or directive in code
    for (const i in obj) {
      if (i === find) {

        let value = obj[i];

        const isString = Array.isArray(value) || typeof value === 'string';
        const newKey = find.substring(2);

        // cascade fix
        if (find === '__cascade' && isString) {
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

  private titleType(t: string): string {
    return t.charAt(0).toUpperCase()
      + t.substring(1);
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
      const isCustom = m._method === 'custom';

      const patch: any = {};

      // filter
      if (q?.__args?.filter) {

        // Get - Custom - Update
        if (isGet || isCustom) {
          q.__args = q.__args.filter;
          delete q.__args.filter;
        }
        if (isUpdate) {
          patch.filter = q.__args.filter;
          delete q.__args.filter;
        }
      }

      // set
      if (q?.__args?.set) {

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
      if (q?.__args?.remove) {
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
        for (const key of Object.keys(q)) {
          if (!key.startsWith('__')) {
            const v = q[key];
            delete q[key];
            if (!q[m._type]) {
              q[m._type] = {};
            }
            q[m._type][key] = v;
          }
        }
        q.numUids = 1;

        if (isDelete) {
          q.msg = 1;
        }
      }

      // type - function
      let key = isCustom
        ? m._type :
        m._method + this.titleType(m._type);

      // alias
      if (m._alias) {
        key = m._alias;
        q.__aliasFor = m._method + this.titleType(m._type);
      }
      obj[key] = q;
    }

    const r = jsonToGraphQLQuery({
      [this._operation]: obj
    }, this._opts).split(' (').join('(');

    // reset object
    this.reset();
    
    return r;
  }

  buildSubscription(): any {
    this.operation('subscription');
    return this.build();
  }

}
