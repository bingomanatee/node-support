var _ = require('underscore');

function Timebomb(callback, delay, name) {
    this._callback = callback;
    this.delay = delay ? delay : 100;
    this.name = name ? name : ''
}

_.extend(Timebomb.prototype, {
    _timeout:false,

    start:function (n) {
        this.stop();
        
        if(n){
            this.delay = n;
        }

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