var _ = require('underscore');
var util = require('util');
var Gate = require('support/gate');
var Pipe = require('support/pipe');

/**
 * Mongoose Model is, for the most part, a wrapper for the mongoose schema.
 * There are a few reasons for its existence:
 *
 * 1) its generally considered good practice to have a layer between
 *    your custom model class and the retrieval class
 *
 * 2) I wanted a more REST-ish API for models, one that while it allows for
 *    mongoosey options, also allows for a more streamlined use of traditional
 *    rest methods a la MyModel.get(3, function(err, my_model)).
 *
 * That being said, the MongooseModel returns Mongoose Documents, not instances
 * of itself or any other custom record .. by default.
 *
 * @VERY BIG USAGE NOTE!!!
 *
 * mongoose must be INJECTED into the mongoose model. This is because each mongoose
 * has a potentially different default database, and I don't want to tie this model
 * to a particular version of mongoose. That being said it is designed for at least
 * mongoose v.3.x.
 *
 * @param model
 * @param config
 */

function MongooseModel(model, config, mongoose) {

    if (config) {
        _.extend(this, config);
    }
//    console.log('mon model: %s', util.inspect(model));

    if (!(model instanceof mongoose.Model)) {
        //      console.log(' >>>>> processing raw object %s', util.inspect(model));
        if (!this.name) {
            throw new Error("Dynamic models MUST have names!");
        }
        var schema;
        if ((model instanceof mongoose.Schema)) {
            schema = model;
        } else {
            //        console.log('making schema')
            schema = new mongoose.Schema(model);
        }

        schema.statics.active = function (cb) {
            var q = {'$nor':[{deleted: true}]};
            return cb ? this.find(q).exec(cb) : this.find(q);
        }

        schema.statics.active_count = function (cb) {
            var q = {'$nor':[{deleted: true}]};
            return cb ? this.find(q).count(cb) : this.find(q).count();
        }

        schema.statics.inactive = function (cb) {
            return cb ? this.find('deleted', true).exec(cb) : this.find('deleted', true)
        }

        model = mongoose.model(this.name, schema);
        //  console.log('model = %s', util.inspect(model));
    }
    this.model = model;

    this.active = function (cb) {
        return this.model.active(cb);
    }

}

MongooseModel.prototype = {

    force_oid:true,

    get:function (id, fields, options, callback) {
        return this.model.findById(id, fields, options, callback);
    },

    /**
     * Adds MULTIPLE records.
     *
     * @param records
     * @param callback
     * @param as_group
     * @param debug
     * @return {*}
     */
    add:function (records, callback, as_group, debug) {
        if (!_.isArray(records)) {
            return this.put(records, callback);
        }

        if (as_group) {
            this.model.collection.insert(records, callback);
        } else {
            if (debug)  console.log('addding %s', util.inspect(records));
            var self = this;
            var gate = new Gate(function () {
                callback(null, results);
            }, 'add_records');
            var results = [];
            records.forEach(function (record) {
                gate.task_start();
                self.put(record, function (err, result) {
                    if (result && !err) {
                        results.push(result);
                    }
                    gate.task_done();
                });
            });

            gate.start();
        }

    },

    _on_save:function (callback, record) {
        var self = this;
        var _callback = callback;

        /* "trick" the callback into executing post_save if it exists */

        if (this.post_save) {
            _callback = function (err, doc) {
                if (err) {
                    //        console.log('err on save - skipping post_save');
                    callback(err);
                } else {
                    //          console.log('doing post save');
                    if (!doc) {
                        doc = record;
                    }
                    self.post_save(doc, callback);
                }
            }
        }

        return _callback;
    },

    /**
     * Adds a single record
     *
     * @param doc
     * @param options
     * @param callback
     */
    put:function (doc, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = {};
        }

        var doc_obj;
        if (doc instanceof mongoose.Document) {
            doc_obj = doc;
        } else {
            doc_obj = new this.model(doc);
        }
        //console.log('putting %s', util.inspect(doc_obj));

        var _callback = this._on_save(callback);

        function _save(altered_doc) {

            if (altered_doc) {
                doc_obj = altered_doc;
            }

            doc_obj.save(function (err) {
                if (err) {
                    callback(err);
                } else {
                    _callback(null, doc_obj);
                }
            });
        }

        if (this.pre_save) {
            this.pre_save(doc_obj, function (err, altered_doc) {
                if (err) {
                    callback(err);
                } else {
                    _save(altered_doc);
                }
            })
        } else {
            _save();
        }

    },

    /* REVISE presumes a PARTIAL set of field data. */

    revise:function (data, callback) {

        if (!data._id){
            return callback(new Error('no _id in data'));
        }

        //console.log(' =========== revise data: %s', util.inspect(data));
        var self = this;

        this.get(data._id, function (err, record) {

            if (err) {
                callback(err);
            } else if (record) {
                delete data._id;

                var array_props = [];
                var has_array_props = false;
                var non_array_props = {};
                var has_na_props = false;

                function _callback(err, new_record) {
                    console.log('final callback: err-- %s, new record: %s', util.inspect(err), util.inspect(new_record));
                    if (err) {
                        return callback(err);
                    } else if (!new_record) {
                        record = new_record;
                    }
                    callback(null, record);
                }

                _.each(data, function (value, key) {
                    if (_.isArray(value)) {
                        array_props.push({field:key, values:value});
                        has_array_props = true;
                    } else { // @TODO: what about objects?
                        non_array_props[key] = value;
                        has_na_props = true;
                    }
                });

                console.log('array_props: %s', util.inspect(array_props));
                console.log('non_array_props: %s', util.inspect(non_array_props));

                function _handle_array_props() {
                    var p = new Pipe(function () {
                            //   console.log('getting record %s', record._id);
                            self.get(record._id, _callback);
                        },
                        function (key_value, record, act_done, pipe_done) {
                            if (!key_value) {
                                return pipe_done();
                            }

                            var field = key_value.field;
                            var values = key_value.values;

                            function _add_array_values() {
                                //  console.log('adding array values for %s', field);
                                record[field] = values;
                                record.save(act_done)
                            }

                            //    console.log('processing field %s: values %s', field, util.inspect(values));

                            if (record[field]) {
                                //   console.log('removing old %s', field);
                                if (_.isArray(record[field])) {
                                    while (record[field].length > 0) {
                                        console.log('removing first %s of %s', field, record[field].length);
                                        record[field].remove(record[field][0]);
                                    }
                                } else {
                                    record[field] = [];
                                }
                                //      console.log('saving record %s', record._id);
                                record.save(_add_array_values);
                            } else {
                                _add_array_values();
                            }
                        },
                        array_props,
                        record
                    );
                    p.start();
                }

                if (has_na_props) {
                    _.extend(record, non_array_props);
                    record.save(has_array_props ? _handle_array_props : _callback);
                } else if (has_array_props) {
                    _handle_array_props();
                } else {
                    _callback();
                }
            } else {
                callback(new Err('cannot find record ' + data._id));
            }
        })

    },

    post:function (doc, options, callback) {
        this.put(doc, options, callback);
    },

    all:function (callback, max, skip) {
        if (!skip) {
            skip = 0;
        }
        if (!max) {
            max = 500;
        }
        ;
        try {
            var all = this.model.find({}).sort('_id').slice(skip, max);
            if (callback) {
                all.exec(callback);
            } else {
                return all;
            }
        } catch (err) {
            callback(err);
        }
    },

    delete:function (id, callback, soft) {
        if (id) {

            this.get(id, function (err, doc) {
                if (doc) {
                    if (soft) {
                        doc.deleted = true;
                        doc.save();
                        callback(null, doc);
                    } else {
                        doc.remove(callback);
                    }
                } else {
                    callback(new Error('Cannot find that document ' + id));
                }
            })
        } else {
            callback(new Error('no id passed to mm delete'));
        }
    },

    find:function (crit, field, options, callback) {
        return this.model.find(crit, field, options, callback);
    },

    find_one:function (crit, field, options, callback) {
        return this.model.findOne(crit, field, options, callback);
    },

    model:null,

    count:function () {
        var a = arguments;
        var args = [].slice.call(a, 0);
        return this.model.count.apply(this.model, args);
    },

    validation_errors:function (err) {
        var req_re = /Validator "required" failed for path .*/;

        function _filter_error(error) {
            if (req_re.test(error)) {
                return 'required';
            }
            return error;
        }

        var list = [];
        for (var field in err.errors) {
            list.push(_filter_error(field + ': ' + err.errors[field].message));
        }
        return list.join(',');
    },

    empty:function (cb) {
        var self = this;
        console.log('dropping %s ...', self.model.name);
        this.model.collection.drop(cb);
    },

    validate:function (values, cb) {
        var m = new this.model(values);
        m.validate(function (err) {
            cb(err, m);
        });
    }
}

module.exports = {
    MongooseModel:MongooseModel,
    create:function (model, config, mongoose) {
        return new MongooseModel(model, config);
    }
}