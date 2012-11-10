var _ = require('underscore');
var nakamura_gate = require('gate');
var _DEBUG = false;


/**
 * Adds MULTIPLE records.
 *
 * @param records
 * @param callback
 * @param as_group: boolean -- note if you insert as a group you will SIDESTEP any events added to your model.
 * @return {*} // note - results vary by input.
 *
 *  put in one record, get one record;
 *  put in many records/array, get back array of records.
 */
module.exports = function (records, callback, as_group) {
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

}