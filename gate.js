/**
 * This module allows you to track aggregate activity and
 * execute one or more callbacks when your tasks clear.
 * It is not necessary to identify individual tasks as
 * the only thing this class cares about is the quantity of tasks in the queue.
 *
 * However for future proofing, tasks are identified and optionally removed by name.
 */
var _ = require('./../../node_modules/underscore');

module.exports = function (callback) {
    this._tasks = [];
    this._start = false;
    this.debug = false;
    this._callback = callback;
}

module.exports.prototype.start = function () {
    this._start = true;
    var self = this;
    if (this.debug) {
        console.log(__filename + ':: start starting with ' + this._tasks.length + ' tasks');
    }
    this._check_status();
}

module.exports.prototype.task_start = function (task) {
    if (!task) {
        task = this._tasks.length
    }
    this._tasks.push(task);
    if (this.debug) {
        console.log('gate task start');
    }
}


/**
 * @id scalar (optional)
 * returns either the designated task
 * or the last task in the queue.
 */
module.exports.prototype.task_done = function () {
    var done_task = this._tasks.pop();

    if (this.debug) {
        console.log('gate task done');
    }

    this._check_status();
}

/**
 * returns a callback that, when called, acknowledges
 * that a task has been completed.
 * @param start_task
 */
module.exports.prototype.task_done_callback = function (start_task) {
    var my_gate = this;
    return function () {
        my_gate.task_done();
    }
    if (start_task) {
        // acknowledge that a task has been begun.
        this.task_start();
    }
}

module.exports.prototype._check_status = function () {
    var self = this;

    if (this._start) {
        if (this._tasks.length < 1) {
            this._start = false;
            if (this.debug) {
                console.log(__filename + ':: _check_status: done with gate');
            }
            this._callback(self);
        } else {
            if (this.debug) {
                console.log('task done; ', this._tasks.length, ' tasks left');
            }
        }
    } else {
        if (this.debug) {
            console.log('task done; ', this._tasks.length, ' tasks left - STILL NOT STARTED');
        }
    }
}
