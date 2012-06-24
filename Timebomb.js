var _ = require('underscore');
var util = require('util');
var fs = require('fs');

function Timebomb(callback, delay, name) {
    this._callback = callback;
    this.delay = delay ? delay : 100;
    this.name = name ? name : ''
}

_.extend(Timebomb.prototype, {
    _timeout:false,

    start:function () {
        this.stop();

        this._timeout = setTimeout(this._callback, this.delay);
    },

    stop:function () {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }
    }
})

/* ***************** CLOSURE ************* */

/* ***************** MODULE *********** */

module.exports = Timebomb