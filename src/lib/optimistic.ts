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