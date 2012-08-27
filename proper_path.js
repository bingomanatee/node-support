var _DEBUG = false;
module.exports = function (resource_path, open_head) {

    if (typeof resource_path != 'string'){
        throw new Error('proper_path:: bad path %s', util.inspect(resource_path));
    }

    if (_DEBUG) console.log('proper pathing %s', resource_path);

    if (resource_path == ''){
        if (open_head){
            return '';
        } else {
            return '/';
        }
    } else if (resource_path == '/'){
      //  console.log('root %s returning "/"', resource_path);
        return '/';
    } else if ((!open_head) && (resource_path.substring(0, 1) != '/')) { // insisting on first "/" being present
        resource_path = '/' + resource_path;
    }

    if (resource_path.substr(-1) == '/') { // insisting on NOT ending in "/";
     //  console.log('removing trailing "/" from %s', resource_path);
       resource_path = resource_path.substring(0, resource_path.length - 1);
    }

    //    console.log('proper_path - pathing returning %s', resource_path);

    return resource_path;
}