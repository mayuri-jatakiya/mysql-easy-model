'use strict';

//change to var model = require('mysql-easy-model').model
var model = require('../../../index').model;

var User = model('user', {
	table: 'user',
	fields: ['id', 'name', 'email'],
	primary: ['id']
});
