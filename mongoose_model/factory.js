var async = require('async');
var util = require('util');
var _ = require('underscore');
var Gate = require('gate');

module.exports = function (model, generator, count, callback, dontreturn) {
    var aborted = false;
    var killjoy;

    console.log('making %s %s s', count, model.name);
    var gate = Gate.create({failFast:true});
    for (index = 0; index < count; ++index) {
        if (aborted) return;

        if (dontreturn) {
            var latch = gate.latch();
            model.put(generator(index), function () {
                latch();
            });
        } else {
            model.put(generator(index), gate.latch());
        }

    }

    gate.await(function (err, res) {
        if (err) {
            return cb(err);
        }
        callback(null, _.map(res, function (items) {
            return items[1];
        }))

    });

    killjoy = setTimeout(function () {
        aborted = true;
        callback(new Error('factory took too long'));
        gate.canceled = true;
    }, 1000 * count);

}