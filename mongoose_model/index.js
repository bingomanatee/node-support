var _ = require('underscore');
var util = require('util');
var Gate = require('support/gate');
var nakamura_gate = require('./../node_modules/gate');
var _DEBUG = false;

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
 * @ANOTHER BIG CHANGE
 *
 * because it is difficult to prevent people from simply calling save() on a document
 * I am removing my heavy handed pre-save / post-save system here; if you want to filter
 * or add events to your routines, use striaght Mongoose injection.
 *
 * @param model
 * @param config
 */

module.exports = {
    create:function (model, config, mongoose) {
        function MongooseModel(model, config, mongoose) {
            if (!mongoose) {
                throw new Error('Mongoose model must now have an injected mongoose resource.')
            }

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

                schema.statics.active = function (callback) {
                    var q = {'$nor':[
                        {deleted:true}
                    ]};
                    return callback ? this.find(q).exec(callback) : this.find(q);
                }

                schema.statics.active_count = function (callback) {
                    var q = {'$nor':[
                        {deleted:true}
                    ]};
                    return callback ? this.find(q).count(callback) : this.find(q).count();
                }

                schema.statics.inactive = function (callback) {
                    return callback ? this.find('deleted', true).exec(callback) : this.find('deleted', true)
                }

                model = mongoose.model(this.name, schema);
                //  console.log('model = %s', util.inspect(model));
            }
            this.model = model;

            this.active = function (callback) {
                return this.model.active(callback);
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
             * @param as_group: boolean -- note if you insert as a group you will SIDESTEP any events added to your model.
             * @return {*} // note - results vary by input. Put in one record, get one record; put in many records/array, get back array of records.
             */
            add:function (records, callback, as_group) {
                if (!_.isArray(records)) {
                    return this.put(records, callback);
                }

                if (as_group) {
                    this.model.collection.insert(records, callback);
                } else {
                    if (_DEBUG)  console.log('addding %s', util.inspect(records));
                    var self = this;
              /*      var gate = new Gate(function () {
                        callback(null, results);
                    }, 'add_records'); */

                    var ngate = nakamura_gate.create({failFast: false});

                    records.forEach(function (record) {
                        self.put(record, ngate.latch());
                    });

                    ngate.await(function(err, results){
                        var errs = _.reduce(results, function(m, r){
                            if (r[0]){
                                m.push(r[0]);
                            }
                            return m;
                        }, []);
                        if (errs.length){
                            callback(errs, results);
                        } else {
                            callback(err, results);
                        }

                    })
                }

            },

            /**
             * Adds a single record.
             * note - unlike mongoose save(), will return document as second parameter.
             * accepts raw data or mongoose document.
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

                doc_obj.save(callback);
            },

            /* REVISE presumes a PARTIAL set of field data. */

            revise:function (data, callback) {
                if (!data._id) {
                    return callback(new Error('no _id in data'));
                }

                var self = this;

                this.get(data._id, function (err, record) {

                    if (err) {
                        callback(err);
                    } else if (record) {
                        _.each(data, function (value, key) {
                            if (key == '_id') {
                                return;
                            } else if (value == '__REMOVE') {
                                if (_.isArray(record[key])) {
                                    record.markModified(key);
                                    record[key] = [];
                                    // note: arrays are not "deleted" per se: they are emptied of all elements.
                                } else {
                                    delete record[key];
                                }
                            } else {
                                if (_.isArray(record[key]) || _.isArray(value)) {
                                    record.markModified(key);
                                }
                                record[key] = value;
                            }
                        })
                        record.save(callback);
                    } else {
                        callback(new Error('cannot find record ' + data._id));
                    }

                })
            },

            post:function (doc, options, callback) {
                this.put(doc, options, callback);
            },

            all:function (callback, max, skip) {
                try {
                    var all = this.model.find({}).sort('_id');

                    if (max || skip) {
                        all.slice(skip, max);
                    }
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
                    if(id._id){
                        id = id._id;
                    }
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

            /**
             * direct passthrough to mogngoose
             * @conditions: (optional) - a query to qualify count
             * @callback: function
             * @return {Object}
             */
            count:function (conditions, callback) {
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

            empty:function (callback) {
                var self = this;
                console.log('dropping %s ...', self.model.name);
                this.model.collection.drop(callback);
            },

            validate:function (values, callback) {
                var m = new this.model(values);
                m.validate(function (err) {
                    callback(err, m);
                });
            }
        }

        return new MongooseModel(model, config, mongoose);
    }
}