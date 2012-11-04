var _ = require('underscore');

/**
 * This method of MongooseModel selectively updates a Mongoose record
 * with an object of replacement values.
 *
 * @param data
 * @param callback
 * @return {*}
 */

module.exports = function (data, callback) {
    if (!data._id) {
        return callback(new Error('no _id in data'));
    }

    var self = this;

    this.get(data._id, function (err, record) {

        if (err) {
            callback(err);
        } else if (record) {
            // iterating over the INPUT object to selectively seed the found record
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
}