var fs = require('fs');
var path = require('path');
var util = require('util');
var Gate = require('./gate');

/**
 * executes across all files/dirs in a directory - non recursive.
 * Note that the main callback is not called until either all the file/dir items have executed
 * (assuming the path is good).
 *
 * @param root_path  :string - an absolute directory path
 * @param if_file(done_callback):   :function - executes on all files. Passed full path to file.
 * @param if_dir(done_callback):    :function - executes on all directories. Passed full path to file.
 * @param if_nopath(callback)  :function - executes if root path does not exist; otherwise error thrown.
 */
module.exports = function(root_path, callback, if_file, if_dir, if_nopath) {
    root_path = root_path.replace(/\/$/, '');
    if (!path.existsSync(root_path)) {
      //  console.log('no path ', root_path);

        if (if_nopath) {
             //   console.log('handling no path ', root_path);
            if_nopath(root_path, callback);
        } else {
            callback(new Error(util.format('%s: cannot find path "%s"', __dirname, root_path)));
        }

    } else {

        var items = fs.readdirSync(root_path);
        var gate = new Gate(callback);

        items.forEach(function(item) {
            var full_path = root_path + '/' + item;
            var s = fs.statSync(full_path);
            if (s.isDirectory() && if_dir) {
                if_dir(full_path, gate.task_done_callback(true));
            } else if (s.isFile() && if_file){
                if_file(full_path, gate.task_done_callback(true));
            }
        })

        gate.start();
    }

}