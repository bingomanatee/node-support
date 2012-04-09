var _ = require('underscore');
var util = require('util');

function Wstat(params){
    this.weight = 'weight';
    this.value  = 'value';
    _.extend(this, params);
    _.defaults(this, {values: []});
}

module.exports = Wstat;

Wstat.prototype = {

    w_avg: function(){

        var weights = 0;
        var sum = 0;
        var self = this;

        this.values.forEach(function(item){
            var value = 0;
            var weight = 1;
            if (item.hasOwnProperty(self.value)){
                value = item[self.value];
            };

            if (item.hasOwnProperty(self.weight)){
                weight = item[self.weight];
            }

            if (isNaN(value) || isNaN(weight) || (!isFinite(value)) || (!isFinite(weight))){
                return;
            }

            if (weight <= 0){
                return;
            }

            weights += weight;
            sum += value * weight;
        });

        if (weights <= 0){
            return 0;
        }
        var out = sum / weights;
        if (isNaN(out) || (!isFinite(out))){
            console.log('w_avg isNaN: %s', util.inspect(this.values));
            return 0;
        }
        return out;
    }


}