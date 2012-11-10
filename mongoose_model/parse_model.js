/**
 *
 * @param model Object | Mongoose.Model | Mongoose.Schema
 * @param mongoose - the Mongoose module
 * @param mongoose_model the MongooseModel root object
 */

module.exports = function (model, mongoose, mongoose_model) {

    if (model instanceof mongoose.Model) {
        mongoose_model.model = model;
    } else {
        //      console.log(' >>>>> processing raw object %s', util.inspect(model));
        if (!mongoose_model.name) {
            throw new Error("Dynamic models MUST have names!");
        }
        var schema;
        if ((model instanceof mongoose.Schema)) {
            schema = model;
        } else {
            //        console.log('making schema')
            schema = new mongoose.Schema(model);
        }

        try {

            schema.statics.active = function (callback) {
                var q = {'$nor':[
                    {deleted:true}
                ]};
                return callback ? mongoose_model.find(q).exec(callback) : mongoose_model.find(q);
            }

            schema.statics.active_count = function (callback) {
                var q = {'$nor':[
                    {deleted:true}
                ]};
                return callback ? mongoose_model.find(q).count(callback) : mongoose_model.find(q).count();
            }

            schema.statics.inactive = function (callback) {
                return callback ? mongoose_model.find('deleted', true).exec(callback) : mongoose_model.find('deleted', true)
            }

            mongoose_model.model = mongoose.model(mongoose_model.name, schema);
        } catch (e) {
            console.log('error in mongoose modelling: %s', e.getMessage());
            throw e;
        }
    }

}