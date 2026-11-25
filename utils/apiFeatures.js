// Reusable query builder for list endpoints.
//
// Usage:
//   const features = new APIFeatures(Course.find({ status: 'published' }), req.query, {
//     filterFields: { category: 'objectId', level: ['beginner', 'advanced'], price: 'number' },
//     sortFields: ['createdAt', 'price'],
//   }).search().filter().sort().paginate();
//   const docs = await features.query;
//
// Only fields listed in `filterFields` / `sortFields` are honoured. The previous version
// passed the raw query string straight into Mongo (any field, any operator), which let
// callers filter on fields they shouldn't and request unbounded page sizes.
//
// filterFields types:
//   'objectId' -> exact match, must be a valid ObjectId
//   'string'   -> exact match
//   'number'   -> exact match (?price=0) or range (?price[gte]=10&price[lte]=50)
//   [..values] -> enum, value must be one of the list
const mongoose = require('mongoose');

const RANGE_OPS = ['gte', 'gt', 'lte', 'lt'];

const badRequest = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const toNumber = (raw, field) => {
  const n = Number(raw);
  if (raw === '' || !Number.isFinite(n)) throw badRequest(`"${field}" must be a number`);
  return n;
};

const castValue = (raw, type, field) => {
  if (Array.isArray(type)) {
    if (!type.includes(raw)) throw badRequest(`"${field}" must be one of: ${type.join(', ')}`);
    return raw;
  }
  switch (type) {
    case 'objectId':
      if (!mongoose.isValidObjectId(raw)) throw badRequest(`"${field}" is not a valid id`);
      return raw;
    case 'number':
      return toNumber(raw, field);
    case 'string':
      return raw;
    default:
      throw new Error(`APIFeatures: unknown filter type "${type}" for "${field}"`);
  }
};

class APIFeatures {
  constructor(query, queryString = {}, options = {}) {
    this.query = query;
    this.queryString = queryString;
    this.options = {
      filterFields: {},
      sortFields: ['createdAt'],
      defaultSort: '-createdAt',
      defaultLimit: 12,
      maxLimit: 50,
      ...options,
    };
  }

  search() {
    const { keyword } = this.queryString;
    if (typeof keyword === 'string' && keyword.trim()) {
      this.query = this.query.find({ $text: { $search: keyword.trim().slice(0, 100) } });
    }
    return this;
  }

  filter() {
    const conditions = {};

    Object.entries(this.options.filterFields).forEach(([field, type]) => {
      const raw = this.queryString[field];
      if (raw === undefined || raw === '') return;

      if (typeof raw === 'string') {
        conditions[field] = castValue(raw, type, field);
        return;
      }

      // Range object, e.g. ?price[gte]=10 -> { price: { gte: '10' } }
      if (type === 'number' && isPlainObject(raw)) {
        const range = {};
        Object.entries(raw).forEach(([op, value]) => {
          if (!RANGE_OPS.includes(op)) throw badRequest(`Unsupported operator "${op}" on "${field}"`);
          range[`$${op}`] = toNumber(value, field);
        });
        conditions[field] = range;
        return;
      }

      throw badRequest(`Invalid value for "${field}"`);
    });

    this.query = this.query.find(conditions);
    return this;
  }

  sort() {
    const { sort } = this.queryString;
    const allowed = new Set(this.options.sortFields);

    const tokens = typeof sort === 'string'
      ? sort.split(',').map((s) => s.trim()).filter((s) => allowed.has(s.replace(/^-/, '')))
      : [];

    this.query = this.query.sort(tokens.length ? tokens.join(' ') : this.options.defaultSort);
    return this;
  }

  paginate() {
    const page = Math.max(1, parseInt(this.queryString.page, 10) || 1);
    const requested = parseInt(this.queryString.limit, 10) || this.options.defaultLimit;
    const limit = Math.min(Math.max(1, requested), this.options.maxLimit);

    this.page = page;
    this.limit = limit;
    this.query = this.query.skip((page - 1) * limit).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
