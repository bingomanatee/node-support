module.exports = function (id, callback, soft) {
    if (id) {
        if (id._id) {
            id = id._id;
        }
        this.get(id, function (err, doc) {
            if (doc) {
                if (soft) {
                    doc.deleted = true;

                    doc.save(callback);
                } else {
                    doc.remove(callback);
                }
            } else {
                callback(new Error('Cannot find that document ' + id));
            }
        })
    } else {
        callback(new Error('no id passed to mm delete'));
    }
}