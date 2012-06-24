var async = require('async');
var util = require('util');
var _ = require('underscore');

module.exports = function (model, generator, count, callback, dont_return, preserve) {
    var done = 0;
    var docs = [];
    var errs = [];
    var aborted = false;
    var killjoy;

    function _make() {
        console.log('making %s %s s', count, model.name);
        var index;
        for (index = 0; index < count; ++index) {
            var doc = generator(index);

            (function (i) {
                 function cb(err, record) {
                //     console.log('written %s', util.inspect(record, true, 3));
                    if (aborted) {
                        return;
                    }

                    if (!dont_return) {
                        if (err) {
                            docs[i] = false;
                            errs[i] = err;
                        } else {
                         //   console.log('saving %s', util.inspect(record));
                            docs[i] = record;
                            errs[i] = false;
                        }
                    } else {
                        console.log('not returning %s', util.inspect(record));
                    }
                    ++done;
                //    console.log('model %s of %s made', done, count);
                    if (done >= count) {
                        callback(null, {docs:docs, errs:errs});
                        clearTimeout(killjoy);
                        console.log('DONE MAKING MODELS');
                    }
                }

                model.put(doc, cb);
            })(index);


        }

         killjoy = setTimeout(function () {
            aborted = true;
            callback(new Error('factory took too long'));
        }, 1000 * count);
    }

    _make();

}