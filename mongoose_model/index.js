var _ = require('underscore');
var mongoose = require('mongoose');
var util = require('util');

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
 * @param model
 * @param config
 */

function MongooseModel(model, config) {

    if (config) {
        _.extend(this, config);
    }

    this.model = model;

}

MongooseModel.prototype = {

    force_oid:true,

    get:function (id, fields, options, callback) {
        return this.model.findById(id, fields, options, callback);
    },

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
        console.log('putting %s', util.inspect(doc_obj));

        var self = this;
        var _callback;

        if (this.post_save) {
            _callback = function (err, doc) {
                if (err) {
                    console.log('err on save - skipping post_save');
                    callback(err);
                } else {
                    console.log('doing post save');
                    self.post_save(doc, callback);
                }
            }
        } else {
            _callback = callback;
        }

        if (this.pre_save) {
            this.pre_save(doc_obj, function (err, doc_obj) {
                if (err) {
                    _callback(err);
                } else {
                    doc_obj.save(function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, doc_obj);
                        }
                    });
                }
            })
        } else {
            doc_obj.save(function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, doc_obj);
                }
            });
        }

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
            this.model.find({}).sort('_id', 1).slice(skip, max).run(callback);
        } catch (err) {
            callback(err);
        }
    },

    delete:function (id, callback) {
        this.find(get, function (err, doc) {
            if (doc) {
                doc.remove(callback);
            } else {
                callback(new Error('Cannot find that document'));
            }
        })
    },

    find:function (crit, field, options, callback) {
        return this.model.find(crit, field, options, callback);
    },

    find_one:function (crit, field, options, callback) {
        return this.model.findOne(crit, field, options, callback);
    },

    model:null,

    count:function (crit, cb) {
        return this.model.count(crit, cb);
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
    }

}

module.exports = {
    MongooseModel:MongooseModel,
    create:function (model, config) {
        return new MongooseModel(model, config);
    }
}