var fs = require('fs');

function draw_canvas(canvas, c_path, cb) {
    console.log('drawing canvas to %s: %s w x %s h', c_path, canvas.width, canvas.height);

    var stream = canvas.createPNGStream();
    var out = fs.createWriteStream(c_path);

    stream.on('data', function (c) {
        out.write(c);
    });

    stream.on('end', function () {
        out.close();
        if (cb){
            cb(null, c_path);
        } else {
            console.log('done writing to %s', c_path);
        }
    })

}

module.exports = draw_canvas;