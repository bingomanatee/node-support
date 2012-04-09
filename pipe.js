/**
 * Pipe calls the same function with different parameters;
 * it allows for asynchronous but single threaded activity.
 *
 * action has a profile:
 *   action(param_array_element, this.static_params, this._act_done_callback, this._pipe_done_callback);
 *
 *   note that the last two parameters are functions PRODUCED by local functions.
 */

function Pipe(callback, action, param_array, static_params) {
    this.callback = callback;

    if (typeof action != 'function') {
        throw new Error(__filename + ': non function passed as action');
    }

    if (typeof callback != 'function') {
        throw new Error(__filename + ': non function passed as callback');
    }

    this.action = action;
    this.param_array = param_array ? param_array : [];
    this.stop_on_end_of_param_array = false;
    this.static_params = static_params ? static_params : false;
    this.idle = true;
    this.done = false;
    this.iv = null;
}

module.exports = Pipe;

Pipe.prototype = {

    _iv: function() {
        var self = this;
        return function() {
            self.check_pipe();
        };
    },

    start: function() {
        var self = this;
        this._pipe_done_callback = function() {
        //    console.log('pipe done callback called');
            self.finish();
        };
        this._act_done_callback = function(){
         //   console.log('act done callback called');
            self.act();
        }
        this.act();
    },

    check_pipe: function() {
        if (this.idle) {
            this.idle = false;
            //     console.log('acting');
            this.act();
        }
    },

    /**
     * Pipe allows for an array of changing parameters,passed in param_array
     * -- howver they are optional.
     * The param_array running out of params
     * doesn't trigger finish unless stop_on_end_of_param_array is set to true.
     * If not, then stopping the loop has to be done inside action
     *  by calling pipe.finish(); this is why pipe is the first parameter
     *  of action.
     */

    act: function() {

        if (this.param_array.length) {
            var params = this.param_array.shift();
        } else if (this.stop_on_end_of_param_array) {
       //     console.log('out of params - finishing');
            return this.finish();
        } else {
            params = false;
        }

        // console.log('acting on ', params, this.static_params);
        this.action(params, this.static_params, this._act_done_callback, this._pipe_done_callback);
    },

    _act_done_callback: false,
    _pipe_done_callback: false,

    /**
     * Finish will prevent further functions from being launched.
     * It won't abort the execution of a function being executied.
     */

    finish: function() {
        this.callback(this);
        this.done = true;
    }

}