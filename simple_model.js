var _ = require('underscore');
var util = require('util');

/**
 * This model is intending for testing server systems before the remote repo is added,
 * or for unit testing.
 * @param config
 * @param data
 * @constructor
 */
function MockModel(config, data) {
    var self = this;

    if (config) {
        _.extend(self, config);
    }

    this.repo = [];
    this.index = {};

    if (data) {
        data.forEach(function (item) {
            self.put(item, function () {
            });
        });
    }

}

MockModel.prototype = {

    all:function (callback) {
        callback(null, this.repo.slice(0));
    },

    count:function (filter, callback) {
        if (!callback) {
            filter = null;
            callback = filter;
        }
        callback(null, filter ? _.filter(this.repo, filter).length : this.repo.length);
    },

    del:function (id, callback) {
        var self = this;
        if (self.index.hasOwnProperty(id)) {
            var outed = self.index[id];
            delete self.index[id];
            self.repo = _.reject(self.repo, function (n) {
                var nid = n[self.key];

                //  console.log('test: key %s == %s', nid, id);
                return nid == id;
            });

            //  console.log('repo afer del: %s', util.inspect(this.repo));

            callback(null, outed);
        } else {
            callback(new Error('cannot delete ' + id + '; no record found'));
        }
    },

    get:function (id, callback) {
        if (this.index.hasOwnProperty(id)) {
            callback(null, this.index[id]);
        } else {
            callback(new Error('cannot find key ' + id));
        }
    },

    find:function (what, callback, sort) {
        var self = this;
        var out = [];
        if (typeof what == 'function') {
            f = what;
        } else {
            f = function (n) {
                for (p in what) {
                    var pvalue = what[p];

                    if (!n.hasOwnProperty(p)) {
                        return false;
                    } else if (n[p] != pvalue) {
                        return false;
                    }

                }
                return true;
            }
        }

        out = _.filter(self.repo, f);
        if (sort) {
            return  _.sortBy(out, sort);
        } else {
            return out;
        }
    },

    key:'id',

    next_key:function () {
        var self = this;
        var id = 0;


        this.repo.forEach(function (obj) {
            var oid = obj[self.key];
            //   console.log('next_key == %s', oid);
            if (oid > id) {
                id = oid;
            }
        });

        //  console.log('next_key: returning %s', id);
        return id + 1;
    },

    put:function (obj, callback) {
        var self = this;

        if (_.isObject(obj)) {
            if (obj.hasOwnProperty(self.key)) {
                obj[self.key] = parseInt(obj[self.key]);
                self.repo = _.reject(self.repo, function (item) {
                    if (!item.hasOwnProperty(self.key)) {
                        return false;
                    }

                    return item[self.key] == obj[self.key]
                })// done cleaning out old object
            } else {
                obj[self.key] = self.next_key();
            }

            self.repo.push(obj);
            self.index[obj[self.key]] = obj;

            if (callback) {
                callback(null, obj);
            }

        }

    }

}

module.exports = MockModel;