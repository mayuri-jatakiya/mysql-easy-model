# mysql-easy-model
MySQL Easy Model

## Install
Install from npm package:
> npm install mysql-easy-model

Or install from git:
> npm install git://github.com/rudolfoborges/mysql-easy-model.git

## Usage

### Connecting to MongoDB

First, we need to define a connection.
```js
var mysqlEasyModel = require('mysql-easy-model');

mysqlEasyModel.createConnection({
	connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password		: '',
    database        : 'test'
});
```

### Defining a Model

Models are defined through the options object.
```js
var User = mysqlEasyModel.model({
	name: 'user',
	table: 'user',
	primary: ['id']
});
```



