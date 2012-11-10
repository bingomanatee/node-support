var _ = require('underscore');
var util = require('util');
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
 * or add events to your Mongoose model (as opposed to relying in MongooseModel events
 * , use striaght Mongoose injection.
 *
 * @param model
 * @param config
 */

var _revise = require('./revise');
var _add = require('./add');
var _parse_model = require('./parse_model');
var _delete = require('./delete');
var _archive = require('./archive');
var _put_mixin = require('./put');

function MongooseModel(model, config, mongoose) {
    if (!mongoose) {
        throw new Error('Mongoose model must now have an injected mongoose resource.')
    }

    //@TODO: sanitize configuration to protect critical methods.

    if (config) {
        _.extend(this, config);
    }

    _parse_model(model, mongoose, this);

    this.add        = _.bind(_add, this);
    this.revise     = _.bind(_revise, this);
    this.delete     = _.bind(_delete, this);
    this.archive    = _.bind(_archive, this);
    _put_mixin(this, mongoose);

    // note: active is bound to the schema.statics inside _parse_model

    var self = this;
    this.active = function (callback) {
        return self.model.active(callback);
    }

}

MongooseModel.prototype = {

    force_oid:true,

    get:function (id, fields, options, callback) {
        return this.model.findById(id, fields, options, callback);
    },

    /* REVISE presumes a PARTIAL set of field data. */

    revise: _revise,

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


module.exports = {
    create:function (model, config, mongoose) {

        return new MongooseModel(model, config, mongoose);
    }
}