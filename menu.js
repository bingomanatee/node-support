var _ = require('./../../node_modules/underscore');
var util = require('util');

function Menu(config) {
    this._init(config);
}

var menu_id = 0;
Menu.prototype = {
    _init:function (config) {
        _.extend(this, config);
        this._menu_id = ++menu_id;

        if (this.children && _.isArray(this.children)){
            for (var i = 0; i < this.children.length; ++i){
                this.children[i] = new Menu(this.children[i]);
            }
        }
    },
    title:'',
    link:'',
    visible:function (env) {
        return true;
    },
    active:function (env) {
        return false;
    },
    children:[],
    template:'<div class="menu"><a href="%s" class="menu_item%s">%s</a>%s</div>',
    children_template:'<div class="menu_children">%s</div>',

    render:function (env) {
       // console.log('rendering #%s:%s', this._menu_id, this.title);

        if (!this.visible(env)) {
            return '';
        }
        var ctx_class = this.active(env) ? ' active' : '';
      //  console.log(' ---------- rendering %s children of #%s: %s', this.children.length, this._menu_id, this.title);
        var children_rendered = this._render_children(env);
        return util.format(this.template, this.link, ctx_class, this.title, children_rendered);
    },

    add_child:function (child) {
        var menu = new Menu(child);
      //  console.log('adding child #%s:%s to %s:%s', menu._menu_id, menu.title, this._menu_id, this.title);
        this.children.push(menu);
    },

    _render_children:function (env) {
        if (!this.children.length) {
            return '';
        }
        var menu = this;
        var child_items = [];

        this.children.forEach(function (child, i) {
            try {
                if (child.visible(env)) {
                 //   console.log('rendering child %s of #%s:%s - #%s:%s', i, menu._menu_id, menu.title, child._menu_id, child.title);
                    child_items.push(child.render(env));
                }
            } catch (e) {
                console.log('err: %s', util.inspect(e));
            }
        });

        if (child_items.length > 0) {
            var ci = child_items.join("\n");
     //       console.log('ci: %s', ci);
            return util.format(this.children_template, ci);
        } else {
            return '';
        }
    }
}


module.exports = {
    Menu:Menu,

    create:function (config) {
        return new Menu(config);
    }
}