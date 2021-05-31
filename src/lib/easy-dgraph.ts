/* eslint-disable @typescript-eslint/no-explicit-any */
export class DgraphModule {

  private _type!: string;

  private _method!: string;
  private _call!: string;
  private _q!: any;
  private _gql!: string;

  constructor(type?: string) {
    if (type) {
      this.type(type);
    }
  }

  type(type: string): this {
    this._type = type;
    return this;
  }

  get(q: any): this {
    this._call = 'query';
    this._method = 'get';
    this._q = q;
    return this;
  }

  aggregate(q: any): this {
    this._call = 'query';
    this._method = 'aggregate';
    this._q = q;
    return this;
  }

  query(q: any): this {
    this._call = 'query';
    this._method = 'query';
    this._q = q;
    return this;
  }

  add(q: any): this {
    this._call = 'mutation';
    this._method = 'add';
    this._q = q;
    return this;
  }

  update(q: any): this {
    this._call = 'mutation';
    this._method = 'update';
    this._q = q;
    return this;
  }

  delete(q: any): this {
    this._call = 'mutation';
    this._method = 'delete';
    this._q = q;
    return this;
  }

  customQuery(q: any): this {
    this._call = 'query';
    this._method = 'custom';
    this._q = q;
    return this;
  }

  customMutation(q: any): this {
    this._call = 'mutation';
    this._method = 'custom';
    this._q = q;
    return this;
  }

  generateSub(): any {
    this._call = 'subscription';
    this.addGQL();
    return {
      call: this._call,
      gql: this._gql,
      method: this._method
    };
  }

  generate(): any {
    this.addGQL();
    return {
      call: this._call,
      gql: this._gql,
      method: this._method
    };
  }

  private addGQL(): void {
    this._gql = this.generateQuery();
  }

  private generateQuery(): string {

    // subscription or query
    let exp = this._call;

    // generate proper titles
    const title = this.titleType();

    exp += ` ${this._method}${title} { `;

    if (this._method === 'custom') {

      exp += this._type + '(';
      if (this._call === 'mutation') {
        exp += this.stringify(this._q._set).slice(1, -1);
      } else {
        exp += this.stringify(this._q._filter).slice(1, -1);
      }
      exp += ')';
      if (this._call === 'query') {
        exp += ' { ';
        exp += Object.keys(this._q._select).join(' ');
        exp += ' }';
      }
      return exp + ' }';
    }

    // generate query or get, remove 's'
    exp += `${this._method}${title}`;

    const isMutation = this._call === 'mutation';
    const isWrite = this._method === 'add'
      || this._method === 'update';

    if (isMutation) {
      exp += '(';
      if (isWrite) {
        exp += 'input: ';
        if (this._method === 'add') {
          exp += this.stringify(this._q._set);
        } else {
          exp += this.stringify({
            filter: this._q._find,
            set: this._q._set
          });
        }
      }
      if (this._method === 'delete') {
        exp += `filter: ${this.stringify(this._q._find)}`;
      }
      if (this._q._upsert) {
        exp += ', upsert: true';
      }
      exp += `) {`;
      if (this._method === 'delete') {
        exp += ' msg';
      }
      if (isWrite) {
        exp += ' numUids';
      }
      if (this._q._select) {
        exp += ` ${this._type.toLowerCase()}`;
      }
    }
    if (this._q._select) {
      exp += this.stripQuery(this._q);
    }
    exp += ' }';

    if (isMutation) {
      exp += ' }';
    }

    return exp;
  }

  private titleType(): string {
    return this._type.charAt(0).toUpperCase()
      + this._type.substr(1).toLowerCase();
  }

  private stripQuery(q: any): string {

    const hasInput =
      q._filter ||
      q._order ||
      q._first ||
      q._offset;

    let g = '';

    if (hasInput) {
      g += '(';
      if (q._filter) {
        g += this._method === 'get'
          ? this.stringify(q._filter).slice(1, -1)
          : 'filter: ' + this.stringify(q._filter);
      }
      if (q._order) {
        if (q._filter) {
          g += ', ';
        }
        g += 'order: ' + this.stringify(q._order);
      }
      if (q._offset) {
        if (q._filter || q._order) {
          g += ', ';
        }
        g += 'offset: ' + q._offset;
      }
      if (q._first) {
        if (q._filter || q._order || q._offset) {
          g += ', ';
        }
        g += 'first: ' + q._first;
      }
      g += ')';
    }
    if (q._cascade) {
      g += ' @cascade';
      if (typeof q._cascade === 'object') {
        g += `(${this.stringify(q._cascade)})`;
      }
    }
    g += ' { ';

    if (q._select) {
      const keys = Object.keys(q._select);

      for (const k of keys) {
        g += k;
        if (keys[keys.length - 1] !== k) {
          g += ' ';
        }
        if (typeof q._select[k] === 'object') {
          g += this.stripQuery(q._select[k]);
        }
      }
    }
    return g + ' }';
  }

  private stringify(obj_from_json: any): any {
    if (typeof obj_from_json !== "object" || Array.isArray(obj_from_json)) {
      // not an object, stringify using native function
      return JSON.stringify(obj_from_json);
    }
    // Implements recursive object serialization according to JSON spec
    // but without quotes around the keys.
    const props = Object
      .keys(obj_from_json)
      .map(key => `${key}:${this.stringify(obj_from_json[key])}`)
      .join(",");
    return `{${props}}`;
  }

}
