var _ = require('underscore');
var util = require('util');
var fs = require('fs');
var path = require('path');

/* ***************** CLOSURE ************* */

function Line2point(p1, p2) {
    this._p1 = p1;
    this._p2 = p2;
}

function Rect(from_pt, to_pt) {
    this._p1 = from_pt;
    this._p2 = to_pt;
}

Rect.prototype = {
    contains:function (pt) {
        return (pt.x >= this._p1.x) && (pt.y >= this._p1.y) && (pt.x <= this._p2.x) && (pt.y <= this._p2.y);
    }
}

Line2point.prototype = {
    _slope:null,

    slope:function () {
        if (!this._slope) {
            if (this._p1.x == this._p2.x) {
                this._slope = Infinity;
            } else {
                this._slope = this.ydist() / this.xdist();
            }
        }
        return this._slope;
    },

    _xdist:null,
    _ydist:null,

    ydist:function () {
        if (null === this._ydist) {
            this._ydist = this._p2.y - this._p1.y;
        }
        return this._ydist;
    },

    xdist:function () {
        if (null === this._xdist) {
            this._xdist = this._p2.x - this._p1.x;
        }
        return this._xdist;
    },

    _c:function () {
        var A = this.ydist();
        var B = -this.xdist();
        return this._p1.x * A + this._p1.y * B;
    },

    eq:function (line) {
        return (line.xdist() == this.xdist())
            && (line.ydist() == this.ydist())
            && (line._c() == this._c());
    },

    _parallel:{x:null, y:null, error:'parallel'},
    _identical:{x:null, y:null, error:'identical'},

    cross:function (line) {
        var A1 = this.ydist();
        var A2 = line.ydist();
        var B1 = -this.xdist();
        var B2 = -line.xdist();
        var C1 = this._c();
        var C2 = line._c();

        if (line.slope() == this.slope()) {

            if (this.eq(line)) {
                return this._identical;
            } else {
                return this._parallel;
            }

        } else if (this.slope() == Infinity) {
            return line.point_at_x(this.p1.x);
        } else if (line.slope() == Infinity) {
            return this.point_at_x(line.p1.x);
        } else {
            var det = A1 * B2 - A2 * B1;

            if (det == 0) {
                return this._parallel;
            } else {

                var x = (B2 * C1 - B1 * C2) / det;
                var y = (A1 * C2 - A2 * C1) / det;

                return {x:x, y:y, between:this.between({x:x, y:y}) && line.between({x:x, y:y})};
            }
        }

    },

    _rect:null,

    rect:function () {
        if (this._rect === null) {
            var min = {x:Math.min(this._p1.x, this._p2.x), y:Math.min(this._p1.y, this._p2.y)};
            var max = {x:Math.max(this._p1.x, this._p2.x), y:Math.max(this._p1.y, this._p2.y)};
            this._rect = new Rect(min, max);
        }
        return this._rect;
    },

    // note - this method DOES NOT check whether the point is on the line!
    // it only validtaes that the point is inside the rect that contains these two points.

    between:function (point) {
        return this.rect().contains(point)
    }
}

/* ***************** MODULE *********** */

module.exports = {

    Line2Point:Line2point,

    Rect:Rect,

    dist:function (p1, p2) {
        var xd = p2.x - p1.x;
        var yd = p2.y - p1.y;

        return Math.sqrt((xd * xd) + (yd * yd));
    },

    unit_vector:function (origin, destination) {
        var distance = module.exports.dist(origin, destination);
        var scale = 1 / distance;
        var vector = module.exports.sub_points(destination, origin);
        return module.exports.scaled_vector(vector, scale);
    },

    add_points:function (p1, p2) {
        return {
            x:p1.x + p2.x,
            y:p1.y + p2.y
        };
    },

    /**
     * subtracts SECOND from FIRST
     * @param p1
     * @param p2
     * @return {Object}
     */
    sub_points:function (p1, p2) {
        return {
            x:p1.x - p2.x,
            y:p1.y - p2.y
        };
    },

    peq:function (p1, p2) {
        return (p1.x == p2.x && p1.y == p2.y);
    },

    scaled_vector:function (vector, scale, origin) {
        if (isNaN(scale)) {
            throw new Error('scaled_vector: isNaN ' + util.inspect(scale));
        }
        var out = {
            x:vector.x * scale,
            y:vector.y * scale
        };

        if (origin) {
            return module.exports.add_points(out, origin);
        } else {
            return out;
        }
    },

    segments:function (p_start, p_end, seg_len) {
        //console.log('segments %s to %s - seg len %s', util.inspect(p_start), util.inspect(p_end), seg_len);
        var p_dist = module.exports.dist(p_start, p_end);
        var points = [_.clone(p_start)];
        var vector = module.exports.unit_vector(p_start, p_end);
        //   console.log('unit vector: ' + util.inspect(vector));

        var scale = 1;
        do {
            var dist = seg_len * scale;
            points.push(module.exports.scaled_vector(vector, dist, p_start));
            ++scale;
        } while (dist < p_dist)

        return points;
    },

    ppv: function(n){
      return Math.round(n * 100)/100;
    },

    pp: function(p){
      return util.format('(%s, %s)', module.exports.ppv(p.x), module.exports.ppv(p.y));
    },

    ppl: function(pl){
      return '[' + _.map(pl, module.exports.pp).join(', ') + ']';
    },

    segments_approx:function (p_start, p_end, seg_len) {
        var dist = this.dist(p_start, p_end);
        var divs = Math.ceil(dist/seg_len);

        console.log('segments %s long from %s to %s: %s divs for %s dist',
            seg_len, this.pp(p_start), this.pp(p_end), divs, dist);

        if (divs <= 1){
            console.log('... short cutting for low divs')
            return [p_start, p_end];
        }
        var points = [];
        for (var i = 0; i <= divs; ++i){
            var x = (p_start.x * i + p_end.x * (divs - i)) / divs;
            var y = (p_start.y * i + p_end.y * (divs - i)) / divs;
            points.push({x: x, y: y});
        }
        return points;
    }
}