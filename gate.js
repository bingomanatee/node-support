/**
 * This module allows you to track aggregate activity and
 * execute one or more callbacks when your tasks clear.
 * It is not necessary to identify individual tasks as
 * the only thing this class cares about is the quantity of tasks in the queue.
 *
 * However for future proofing, tasks are identified and optionally removed by name.
 */
var _ = require('underscore');
var util = require('util');

module.exports = function (callback, name) {
    if ((name == 'undefined') || (!name)){
        throw new Error('gate name == undefined');
    }
    this._tasks = 0;
    this.name = name || '';
    this._start = false;
    this.debug = false;
    this.multi = false;
    this._callback = callback;
    this._tasks_to_do = [];
    this._tasks_done = [];
    this._task_inc = 0;
}

_.extend(module.exports.prototype, {
    start:function () {
        var self = this;
        if (!(this.name)){
            throw new Error('NO NAME for gate');
        }
        process.nextTick(function(){
            self._on_start();
        });
    },

    _on_start: function(){
        this._start = true;
        if (this.debug) {
            console.log('GATE %s:: STARTING!!!!! %s with tasks (cb = %s)', this.name, this._tasks, this._callback.toString());
        }
        this._check_status();
    },

    task_start:function (task) {

        if (!task) {
            task = ++ this._task_inc;
        }
        this._tasks_to_do.push(task);

        ++ this._tasks;
        if (this.debug) {
            console.log('gate %s task starting: %s - status: %s', this.name, task, this._status_str());
        }
    },

    task_done:function (task) {
        -- this._tasks;
        if (!task){
            task = '(unknown)';
        }
        this._tasks_done.push(task);

        if (this.debug) {
            console.log('gate %s task done; %s - status: %s', this.name, task, this._status_str());
        }
        this._check_status();
    },

    _start: false,
    _done: false,

    task_done_callback:function (start_task, on_done, task) {
        var my_gate = this;
        if (_.isString(start_task) && (!task)){
            task = start_task;
        }
        if (start_task) {
            // acknowledge that a task has been begun.
            if (this.debug){
                console.log('starting task and returning callback %s', task);
            }
            this.task_start(task);
        } else {
            if (this.debug){
                console.log('NOT starting task - just returning callback %s', task);
            }
        }
        return function () {
            if (on_done){
                on_done();
            }
            my_gate.task_done( task);
        }
    },

    _status_str: function(){
        return util.format(': %s started: %s, done: %s, to do: (%s), done: (%s)',
            this.name,
            this._start ? 'true' : 'false',
            this._done ? 'true' : 'false',
            this._tasks_to_do.join(','), this._tasks_done.join(','));
    },

    _check_status:function () {
        var self = this;

        if (this.debug){
            console.log( '_check_status: >>>> %s', this._status_str());
        }

        if (this._start) {

            if (this._tasks < 1) {
                if (this._done){
                    if (this.multi){
                        this._callback(self);
                    } else {
                        throw new Error('gate for ' + this._callback.toString() + ' attempting to finish twice. ' + this._status_str());
                    }
                } else {
                    this._done = true;
                    if (this.debug) {
                        console.log('GATE %s:: _check_status:  !!!!! REACHED END !!!!!!', this.name);
                    }
                    this._callback();
                }
            } else {
                if (this.debug) {
                    console.log('GATE %s:: check status  task done; %s tasks left', this.name, this._tasks);
                }
            }
        } else {
            if (this.debug) {
                console.log('GATE %s:: check status, %s left: STILL NOT STARTED; ', this.name, this._tasks);
            }
        }
    }
})

