/**
 * ensures Document state of doc.
 * @param doc mongoose.Document | Object
 * @param mongoose
 * @return mongoose.Document
 */

module.exports = function (doc, mongoose) {

    if (doc instanceof mongoose.Document) {
        return doc;
    } else {
        return new this.model(doc);
    }

}