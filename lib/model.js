/**
 * Created by rudolfoborges on 12/25/15.
 */
'use strict'

var _ = require('lodash');

module.exports = function(db, table, fields, primary){

    function find(attrs, next){
        db.getConnection(function(err, connection){
            
            if('function' == typeof attrs){
                next = attrs;
                attrs = undefined;
            }

            if(attrs){
                var page = '';
                var limit = '';
                if (attrs.page !== '' && attrs.page !== undefined) { 
                    page  = attrs.page; 
                } else { 
                    page=1; 
                }  
                if (attrs.limit !== '' && attrs.limit !== undefined) { 
                    limit  = attrs.limit; 
                } else { 
                    limit=8; 
                }
                
                var sql = ' where 1=1';
                if(attrs.search_col !== undefined && attrs.search_col !== ''){
                    if(attrs.search_txt !== undefined && attrs.search_txt !== ''){
                        var srch_col = attrs.search_col;
                        var searchArray = srch_col.split(",");
                        for(var i = 0; i < searchArray.length; i++){
                            if(i==0){
                                sql += ` AND `+searchArray[i]+` LIKE '%`+attrs.search_txt+`%'`;
                            }else{
                                sql += ` OR `+searchArray[i]+` LIKE '%`+attrs.search_txt+`%'`;
                            }
                        }
                    }
                }
                if(attrs.filter_txt !== undefined && attrs.filter_txt !== ''){
                    var strArray = attrs.filter_txt.split(",");
                    var filter_str = "";
                    for(var j = 0; j < strArray.length; j++){
                        filter_str += "'" + strArray[j] + "'";
                        if(j < strArray.length-1){
                        	filter_str += ",";
                        }
                    }
                    sql += ` AND period IN (`+filter_str+`)`;
                }
                if(attrs.order_col !== undefined && attrs.order_col !== ''){
                    if(attrs.order_by !== undefined && attrs.order_by !== ''){
                        sql += ` ORDER BY `+attrs.order_col+` `+attrs.order_by;
                    }
                }else{
                    sql += ` ORDER BY id DESC`;
                }
                var count_sql = 'select count(*) as count from ' + table +sql;
                var start_from = (page-1) * limit;
                if(start_from !== "" && limit !== ""){
                    sql += ' LIMIT '+start_from+', '+limit;
                }
                var select_query = 'select * from ' + table + sql;
            }
            connection.query(select_query, function(err, rows, fields){
                //connection.release();
                var models = [];
                rows.forEach(function(row){
                    models.push(modelfyRow(row));
                });
                connection.query(count_sql, function (err, count_rows, fields) {
                    connection.release();
                    var rowmodels = {
                        data : models,
                        total:  count_rows[0].count
                    };
                    if(next) next(err, rowmodels, fields);
                });
            });
        });
    }

    function findOne(where, next){
      db.getConnection(function(err, connection){
        connection.query('select * from ' + table + ' where ?', [where], function(err, rows){
            connection.release();
            if(next){
                if(rows && rows.length > 0) next(err, modelfyRow(rows[0]));
                else next('ERROR: Record not found');
            }
            
        });
      });
    }

    function query(sql, attrs, next){
        db.getConnection(function(err, connection){
            connection.query(sql, attrs, function(err, result){
                connection.release();

                if(next && Array.isArray(result) && result.length > 0){
                    var models = [];
                    var rows = result;

                    rows.forEach(function(row){
                        models.push(modelfyRow(row));
                    });

                    next(err, models);
                } else if(next) next(err, result);

            });
        });
    }

    function read(next){
        var model = this;
        var where = {};
        db.getConnection(function(err, connection){
            primary.forEach(function(item){
                where[item] = model[item];
            });

            connection.query('select * from ' + table + ' where ?', [where], function(err, rows){
                connection.release();
                if(next){
                    if(rows && rows.length > 0) {
                        model.__proto__ = modelfyRow(rows[0]);
                        next(err);
                    } else next('ERROR: Record not found');
                }
                
            });    
            
        });
    }

    function create(next){
        var model = this;
        var attrs = {};
        var sql = 'insert into ' + table + ' set ?';

        fields.forEach(function(field){
            if(model._attrs && model._attrs.hasOwnProperty(field) && model._attrs[field]) {
                attrs[field] = model._attrs[field];
            }
        });

        db.getConnection(function(err, connection){
            connection.query(sql, attrs, function(err, result){
                connection.release();
                
                if(!err && result) {
                    if(primary.length == 1) model[primary] = result.insertId;
                    model._attrs = undefined;

                    for(var attr in attrs){
                        model[attr] = attrs[attr];
                    }

                    if(next) next(err, result);
                }
                else if(err && next) next(err, result);
            });
        });
    }
    
    function createBatch(next){
        var model = this;
        var attrs = model._attrs;
      
        var i = 1;
        var columns = "";
        for (var val in attrs[0]) {
            if(i == 1){
                columns += "( ";
            }
            columns += "`"+val+"`";
            if(i < Object.keys(attrs[0]).length){
            	columns += ", ";
            }
            if(i == Object.keys(attrs[0]).length){
            	columns += ")";
            }
            i++;
        }
        
        var str = "";
        var j = 1;
        for (var value in attrs) {
            var k = 1;
            for (var attr in attrs[value]) {
                if(k == 1){
                    str += "( ";
                }
                str += '"'+attrs[value][attr]+'"';
                if(k < Object.keys(attrs[value]).length){
                	str += ", ";
                }
                if(k == Object.keys(attrs[value]).length){
                	str += ")";
                }
                k++;
            }
            if(j < Object.keys(attrs).length){
            	str += ", ";
            }
            j++;
        }

        var insert_query = 'INSERT INTO  ' + table +' '+ columns +' VALUES '+str;
        db.getConnection(function(err, connection){
            connection.query(insert_query , function(err, result){
                connection.release();
                
                if(!err && result) {
                    if(primary.length == 1) model[primary] = result.insertId;
                    model._attrs = undefined;

                    for(var attr in attrs){
                        model[attr] = attrs[attr];
                    }

                    if(next) next(err, result);
                }
                else if(err && next) next(err, result);
            });
        });
    }

    function update(next){
        
        var model = this._attrs || this;
        var attrs = {};
        var where = {};
        var sql = 'update ' + table + ' set ? where ?';

        if(primary.length == 0 && next){
            next('ERROR: Model has no specified PRIMARY, update aborted');
            return;
        }

        fields.forEach(function(field){
            if(model && model.hasOwnProperty(field) && model[field]) {
                attrs[field] = model[field];
            }
        });

        primary.forEach(function(item){
            where[item] = attrs[item];
        });

        db.getConnection(function(err, connection){
            connection.query(sql, [attrs, where], function(err, result){
              connection.release();
              if(next) next(err, result);
            });
        }); 
    }

    function destroy(next){
        var attrs = this._attrs || this;
        // var where = {};

        // if(primary.length == 0 && next){
        //     next('ERROR: Model has no specified PRIMARY, delete aborted');
        //     return;
        // }

        // primary.forEach(function(item){
        //     where[item] = attrs[item];
        // });

        db.getConnection(function(err, connection){
          connection.query('delete from ' + table + ' where ?', [attrs], function(err, result){
            connection.release();
            if(next) next(err, result);
          });
        });
        
    }

    function set(attr, value){
      this._attrs[attr] = value;
    }

    function get(attr){
      return this._attrs[attr];
    }

    function modelfyRow(row){
        row.__proto__.update = model.update;
        row.__proto__.destroy = model.destroy;
        row.__proto__.create = function(attrs, next){
            this._attrs = attrs;
            model.create(next);
        };
        row.__proto__.createBatch = function(attrs, next){
            this._attrs = attrs;
            model.createBatch(next);
        };
        row.__proto__.find = model.find;
        row.__proto__.query = model.query;
        row.__proto__.set = model.set;
        row.__proto__.get = model.get;
        row.__proto__.read = model.read;
        return row;
    }

    var model = {
        find: find,
        findOne: findOne,
        query: query,
        read: read,
        create: create,
        createBatch: createBatch,
        update: update,
        destroy: destroy,
        set: set,
        get: get
    };

    return model;

};
