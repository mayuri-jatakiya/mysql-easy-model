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

            var sql = 'select * from ' + table;

            if(attrs){
                sql += ' where ?'
            }

            connection.query(sql, attrs || [], function(err, rows, fields){
                connection.release();

                var models = [];

                rows.forEach(function(row){
                    models.push(modelfyRow(row));
                });

                if(next) next(err, models, fields);
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
        var where = {};

        if(primary.length == 0 && next){
            next('ERROR: Model has no specified PRIMARY, delete aborted');
            return;
        }

        primary.forEach(function(item){
            where[item] = attrs[item];
        });

        db.getConnection(function(err, connection){
          connection.query('delete from ' + table + ' where ?', [where], function(err, result){
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
        update: update,
        destroy: destroy,
        set: set,
        get: get
    };

    return model;

};
