var _ = require('underscore');
var util = require('util');

module.exports = function (numbers) {
    this.numArr = numbers;
}

module.exports.prototype = {
    _dec:function (num, numOfDec) {
        var pow10s = Math.pow(10, numOfDec || 0);
        return (numOfDec) ? Math.round(pow10s * num) / pow10s : num;
    },

    set_data:function (d) {
        this.numArr = d;
    },

    avg:function (numOfDec) {
        if (!_.isArray(this.numArr)) {
            return false;
        }
        var i = this.numArr.length,
            sum = 0;
        while (i--) {
            sum += this.numArr[i];
        }

        var avg = (sum / this.numArr.length);
        return arguments.length ? this._dec(avg, numOfDec) : avg;
    },

    variance:function (numOfDec) {
        if (!_.isArray(this.numArr)) {
            return false;
        }
        var avg = this.avg(numOfDec),
            i = this.numArr.length,
            v = 0;

        while (i--) {
            v += Math.pow((this.numArr[i] - avg), 2);
        }

        v /= this.numArr.length;
        return arguments.length ? this._dec(v, numOfDec) : v;
    },

    std_dev:function (numOfDec) {
        var stdDev = Math.sqrt(this.variance(numOfDec));
        return arguments.length ? this._dec(stdDev, numOfDec) : stdDev;
    },

    med_ratio:function (ratio) {
        var end_count = Math.max(1, Math.ceil(this.numArr.length * ratio));

        var dists = [];
        var last_dist = false;
        var dist;
        var sorted = _.sortBy(this.numArr, function (v) {
            return v;
        });

       // console.log('sorted dists: %s', util.inspect(sorted));

        sorted.forEach(function (v) {
            dists.push({value:v, last_gap: -1, next_gap: -1});
        })

        dists.forEach(function(dist, i){
           if (i > 0){
               var last_dist = dists[i - 1];
               last_dist.next_gap = dist.value - last_dist.value;
               dist.last_gap = last_dist.next_gap;
           }
        })

        dists.forEach(function (dist) {
                    if (dist.last_gap == -1){
                        dist.gap = 2 * dist.next_gap;
                    } else if (dist.next_gap == -1){
                        dist.gap = 2 * dist.last_gap;
                    } else {
                        dist.gap = (dist.last_gap + dist.next_gap);
                    }
                })

        dists = _.sortBy(dists, function (dist) {
            return dist.gap;
        });

        var sum = 0;

        var slice = dists.slice(0, end_count);
       // console.log('gap rated dists: %s', util.inspect(slice));
        slice.forEach(function(d){ sum += d.value;});


        return sum / (1.0 * end_count);
    }
}