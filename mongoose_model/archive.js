var _ = require('underscore');
var _DEBUG = true;
var util = require('util');

/**
 * returns the fields in a given record,
 * sans _id and _archive
 *
 * @param record Mongoose Document
 * @return [string]
 * @private
 */

function _fields(record) {
    var j = record.toJSON();
    return _.reject(_.keys(j),
        function (key) {
            switch (key) {
                case '_id':
                    return true;
                    break;

                case '__v':
                    return true;
                    break;

                case '_archive':
                    return true;
                    break;
            }
            return false;
        }
    )
}

/**
 * variable api:
 *
 * model.archive(record, callback
 * model.archive(record, data, callback
 * model.archive(record, fields, data, callback
 *
 * @param record
 * @param fields
 * @param data
 * @param callback
 * @private
 *
 * This method does three things:
 *
 * 1) backs up the records' fields as a subdocument in a field called _archives;
 *      - if present, fields define which fields are backed up
 *      - the archive is based on the JSONified version of the record
 *
 * 2) inserts a set of data from the data object, if present
 *
 * 3) saves the updated document, returning the result to callback.
 *
 */

function _archive() {
    var fields = [];
    var data = {};
    var record = null;
    var args = _.toArray(arguments);
    record = args.shift();

    var callback = args.pop();
    if (!_.isFunction(callback)) {
        throw new Error('no callback to _archive');
    }

    if (_.isArray(args[0])) {
        fields = args.shift();
    } else {
        fields = _fields(record);
    }

    if (_.isObject(args[0])) {
        data = args.shift();
    }

    if (_DEBUG) {

        console.log('record: %s', record);
        console.log('fields: %s', util.inspect(fields));
        console.log('data: %s', data);
        console.log('callback: %s', callback);
    }
    // *********** update archive

    var j = record.toJSON();
    delete j._archives;

    var archive = {__archived:new Date()};
    _.each(fields, function (field) {
        archive[field] = j[field];
    })

    if (record._archives) {
        record._archives.push(archive);
    } else {
        record._archives = [archive]
    }
    record.markModified('_archives');

    // ************ update data

    if (data) {
        delete data._archives;
        delete data._id;

        record = _.reduce(fields, function (record, field) {
            var value = data[field];
            if (_.isArray(value) || _.isArray(record[field])) {
                record.markModified(field);
            }
            record[field] = value;
            return record;
        }, record);
    }

    // *************** save

    record.save(callback);

}

/**
 *
 * @param record - either a Mongoose document or an ID
 * @param fields - [string] name of fields in record to be archived (optional)
 * @param data   - an object of key/values to be updated
 * @param callback function
 */
module.exports = function (record, fields, data, callback) {
    var self = this;

    if (!_.isObject(record)) {
        this.get(record, function (err, ro) {
            //@TODO: error check
            _.bind(_archive, self)(ro, fields, data, callback);
        })
    } else {
        _.bind(_archive, self)(record, fields, data, callback);
    }

}