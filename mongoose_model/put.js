var _ = require('underscore');
var _to_doc = require('./to_doc');

/**
 * Adds a single record.
 * note - unlike mongoose save(), will return document as second parameter.
 * accepts raw data or mongoose document.
 *
 * @param doc mongoose.Document | Object
 * @param options - deprecated
 * @param callback function
 */

module.exports = function(model, mongoose){

    model.put = function (doc, options, callback) {
        if (typeof options == 'function') {
            callback = options;
            options = {};
        }

        var doc_obj = _.bind(_to_doc, model)(doc, mongoose);

        doc_obj.save(callback);
    }

}
