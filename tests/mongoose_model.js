var tap = require('tap');
var mongoose_model = require('./../mongoose_model');
var mongoose = require('mongoose');
var util = require('util');
var _ = require('underscore');

var con = 'mongodb://localhost/mongoose_model_tests_' + Math.floor(Math.random() * 100000 + .001);
console.log('creating %s', con);
mongoose.connect(con);
var tests_done = 0;
var TEST_COUNT = 5;

function _try_drop() {
    if (++tests_done >= TEST_COUNT) {
        mongoose.connection.db.executeDbCommand({dropDatabase:1}, function (err, result) {
            console.log(err);
            console.log(result);
            process.exit(0);
        });
    }
}

tap.test('archiving', function (t) {

    var Back_Model = mongoose_model.create(
        {
            name:'string', tags:['string'], notes:'string', _archives: 'mixed'
        },
        {
            name:'back'
        }
        , mongoose
    )

    Back_Model.add({name:'alpha', tags:['a', 'b'], notes:'n'},
        function (err, alpha) {
            t.equals(alpha.name, 'alpha', 'record created with record alpha');

            var new_data = {foo: 'bar', tags: ['c', 'd'],  name: 'dontcopyme'};

            Back_Model.archive(alpha, ['tags'], new_data, function(err, arch_alpha){
                var j = arch_alpha.toJSON();
                if (j._archives && j._archives[0]){

                    t.ok(j._archives[0].__archived, 'has archive date');
                    delete j._archives[0].__archived;
                } else {
                    t.fail('no archives');
                }
                delete j.__v;
                delete(j._id);
                t.deepEqual(j, {name: 'alpha', tags: ['c','d'],notes: 'n', _archives: [{tags: ['a', 'b']}]}, 'archived alpha');
                _try_drop();
                t.end();
            })
        }
    )
})

tap.test('basic get put count', function (t) {

    var Foo_Model = mongoose_model.create(
        {name:{ type:'string', index:{unique:true}}, deleted:'boolean'},
        {
            name:'foo',
            type:'model'
        }, mongoose)

    Foo_Model.count(function (err, num) {
        t.ok(err === null, 'no error to count');
        t.equals(num, 0, 'no records in foo ');

        Foo_Model.put({name:'Robert Paulson'}, function (err, record) {
            t.equals(record.name, 'Robert Paulson', 'My Name is ROBERT PAULSON!');

            Foo_Model.count(function (err, num) {
                t.equals(num, 1, 'one record in db');

                var id = record._id;

                Foo_Model.get(id, function (err, bob2) {

                    t.equals(bob2.name, 'Robert Paulson', 'MY NAME IS ROBERT PAULSON!');


                    Foo_Model.get(bob2, function (err, bob3) {

                        t.equals(bob3.name, 'Robert Paulson', 'git(document, cb) test');

                        Foo_Model.put({name:'Robert Paulson'}, function (err, r2) {
                            t.ok(err, 'should throw error - duplicate name');
                            t.ok(err.message.indexOf('duplicate key error') > 0, 'has expected error msg')
                            // console.log(util.inspect(err));
                            Foo_Model.count(function (err, num) {
                                t.equals(num, 1, 'one record in db ... still');
                                _try_drop();
                                t.end();
                            })
                        })

                    })
                })

            })
        })
    })

})

tap.test('add ', function (t) {

    var Bar_Model = mongoose_model.create(
        {
            name:{ type:'string', index:{unique:true}},
            type:{type:'string', enum:['strip', 'fern', 're']},
            capacity:{type:Number, default:1},
            deleted:'boolean'
        },
        {
            name:'bar',
            type:'model'
        }, mongoose);

    Bar_Model.add([
        {
            name:'Robert Paulson',
            type:'fern',
            capacity:3
        },
        {
            name:'Earl',
            type:'strip',
            capacity:5
        },
        {
            name:'Heisenburg',
            type:'re',
            capacity:10
        }
    ],

        function (err, results) {
            t.ok(err === null, 'no error for first run');

            Bar_Model.add({name:'Mickey Mouse', type:'strip'}, function (err, mouse) {
                t.ok(err === null, 'no mouse errors');
                t.equals(mouse.capacity, 1, 'capacity set to 1 by default');

                Bar_Model.add([
                    {
                        name:'Robert Paulson',
                        type:'fight club',
                        capacity:3
                    },
                    {
                        Name:'Earl',
                        type:'strip',
                        capacity:10
                    },
                    {
                        name:'Heisenburg',
                        type:'re',
                        capacity:'foo'
                    }
                ],

                    function (err, results) {
                        t.ok(err, 'Broke #1 rule of fight club');
                        _try_drop();
                        t.end();

                    })
            })
        })

})

tap.test('revise', function (t) {


    var Bing_Model = mongoose_model.create(
        {
            name:{ type:'string', index:{unique:true}},
            notes:'string',
            type:{type:'string', enum:['food', 'person', 'website' ]},
            deleted:'boolean'
        },
        {
            name:'bing',
            type:'model'
        }, mongoose);

    Bing_Model.add({
        name:"Bing Crosby",
        notes:'The eternal crooner',
        type:'person'
    }, function (err, a_bing) {
        t.ok(err === null, 'crooner is good');
        t.ok(a_bing, 'crooner is great');

        Bing_Model.count(function (err, bings) {
            t.equals(bings, 1, 'one bing');
            Bing_Model.revise({_id:a_bing._id, name:'Harry Lillis Crosby'}, function () {
                t.ok(err === null, 'change is good');

                Bing_Model.count(function (err, b2) {
                    t.equals(b2, bings, 'count unchanged');

                    Bing_Model.get(a_bing._id, function (err, rev_bing) {
                        t.equals(rev_bing.name, 'Harry Lillis Crosby', 'name changed');
                        t.equals(rev_bing.notes, 'The eternal crooner', 'notes still there');

                        Bing_Model.find({name:'Bing Crosby'}, function (err, bc) {

                            t.equals(bc.length, 0, 'no more Bing Crosby');

                            _try_drop();
                            t.end();

                        })
                    })

                })
            });
        })

    })
})


tap.test('soft delete test', function (t) {

    var George_Model = mongoose_model.create(
        {
            name:{ type:'string', index:{unique:true}},
            type:{type:'string', enum:['strip', 'fern', 're']},
            capacity:{type:Number, default:1},
            deleted:'boolean'
        },
        {
            name:'george',
            type:'model'
        }, mongoose);

    George_Model.add([
        {
            name:'Robert Paulson',
            type:'fern',
            capacity:3
        },
        {
            name:'Earl',
            type:'strip',
            capacity:5
        },
        {
            name:'Heisenburg',
            type:'re',
            capacity:10,
            deleted:true
        }
    ], function (err, result) {

        George_Model.all(function (err, all_results) {

            t.equals(all_results.length, 3, 'three entries found by all');

            George_Model.active(function (err, active_results) {
                t.equals(active_results.length, 2, 'two non deleted records left');


                George_Model.delete(active_results[0], function (err, r) {

                    George_Model.all(function (err, results) {
                        t.equals(results.length, 3, 'soft delete leaves three entries');
                        George_Model.active(function (err, non_deleted_results) {
                            t.equals(non_deleted_results.length, 1, 'only one non deleted record left');

                            // note - actaully deleting a record from the collection, permanantly.
                            George_Model.delete(non_deleted_results[0], function () {

                                George_Model.all(function (err, records_left) {
                                    t.equals(records_left.length, 2, 'only two records left in collection');

                                    George_Model.active(function (err, ndr2) {
                                        t.equals(ndr2.length, 0, 'no non-soft-deleted records left');
                                        _try_drop();
                                        t.end();
                                    })
                                })
                            });
                        });
                    })
                }, true)

            })

        })

    })
})