const WhoCan = require('./index'),
  MongoDBInMememory = require('mongo-in-memory'),
  MongoDB = require('mongodb'),
  UUID = require('uuid'),
  Assert = require('assert');

require( 'console-group' ).install();

async function test1(database) {

  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  Assert(await can.can(identifier, action, target));
}

async function test2(database) {

  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(!(await can.can(identifier, action, target)));
}

async function test3(database) {
  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);
  await can.allow(identifier, UUID.v4(), target);
  await can.allow(identifier, UUID.v4(), target);
  await can.allow(identifier, UUID.v4(), UUID.v4());
  await can.allow(identifier, UUID.v4(), UUID.v4());
  await can.allow(UUID.v4(), action, target);
  await can.allow(UUID.v4(), UUID.v4(), target);
  await can.allow(UUID.v4(), UUID.v4(), target);
  await can.allow(UUID.v4(), UUID.v4(), UUID.v4());
  await can.allow(UUID.v4(), UUID.v4(), UUID.v4());

  Assert(await can.can(identifier, action, target));
}

async function test4(database) {
  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  Assert(await can.can(identifier, action, target));

  await can.disallow(identifier, action, target);

  Assert(!(await can.can(identifier, action, target)));
}

async function test5(database) {

  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(() => identifier, () => action, () => target);

  Assert(await can.can(identifier, action, target));
}

async function test6(database) {

  const can = new WhoCan(database);

  const middleware = (action) => {
    return (request, response, next) => {
      can.can(request.user.id, action, request.params.id)
        .then((allow) => {
          if (!allow) {
            return next(new Error('Forbidden'));
          }
          next(null);
        })
        .catch(next);
    }
  };

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  const result = await new Promise((resolve) => {
    middleware(action)({
      user: {
        id: identifier
      },
      params: {
        id: target
      }
    }, {}, resolve);
  });

  Assert(!!result);
}


async function test7(database) {

  const can = new WhoCan(database);

  const middleware = (action) => {
    return (request, response, next) => {
      can.can(request.user.id, action, request.params.id)
        .then((allow) => {
          if (!allow) {
            return next(new Error('Forbidden'));
          }
          next(null);
        })
        .catch(next);
    }
  };

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  const result = await new Promise((resolve) => {
    middleware(action)({
      user: {
        id: identifier
      },
      params: {
        id: target
      }
    }, {}, resolve);
  });

  Assert(!result);
}

async function test8(database) {

  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  Assert(await can.can(identifier, {
    $in: [
      action,
      UUID.v4(),
      UUID.v4()
    ]
  }, target));
}

async function test9(database) {

  const can = new WhoCan(database);

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(!(await can.can(identifier, {
    $in: [
      action,
      UUID.v4(),
      UUID.v4()
    ]
  }, target)));
}

async function runWithDatabase(database) {
  await [
    test1,
    test2,
    test3,
    test4,
    test5,
    test6,
    test7,
    test8,
    test9
  ].reduce((promise, f, index) => {
    return promise.then(async function() {
      console.group(`Running Test ${index + 1}`);
      await f(database);
      console.log(`Complete Test ${index + 1}`);
      console.groupEnd();
    })
  }, Promise.resolve());
}


async function run() {
  const mongoInMemory = new MongoDBInMememory(8000);
  await new Promise((resolve, reject) => {
    mongoInMemory.start((error) => error ? reject(error) : resolve());
  });

  try {
    const database = await new Promise((resolve, reject) => {
      MongoDB.connect(mongoInMemory.getMongouri(UUID.v4()), (error, database) => error ? reject(error) : resolve(database));
    });
    await runWithDatabase(database);
  } finally {
    await new Promise((resolve, reject) => {
      mongoInMemory.stop((error) => error ? reject(error) : resolve());
    })
  }
}

run()
  .then(() => {
    console.log('Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

