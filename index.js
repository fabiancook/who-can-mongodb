/*
 MIT License

 Copyright (c) 2017 Fabian Cook

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
const WhoCan = require('who-can');

class WhoCanMongoDBBacker {

  /**
   * @param {{collection: function}|*} database
   * @param {WhoCanMongoDBOptions} [options={}]
   */
  constructor(database, options) {
    this.database = database;
    this.options = options || {};
  }

  /**
   * @returns {Collection}
   */
  async getCollection() {
    if (this.collection) {
      return this.collection;
    }
    this.collection = this.database.collection(this.options.collection || 'who-can');
    await new Promise((resolve) => {
      this.collection.createIndex(
        {
          identifier: 1,
          action: 1,
          target: 1
        },
        {
          name: 'who-can-identifier-action-target',
          unique: true,
          background: true,
          dropDups: true
        },
        (error) => {
          if (error) {
            console.warn(error);
          }
          resolve();
        } // Ignore issues, we don't mind
      )
    });
    return this.collection;
  }

  /**
   * @param identifier
   * @param action
   * @param target
   */
  async allow(identifier, action, target) {
    const collection = await this.getCollection();
    return new Promise((resolve, reject) => {
      collection.updateOne(
        {
          identifier,
          action,
          target
        },
        {
          $setOnInsert: {
            identifier,
            action,
            target,
            createdAt: new Date()
          },
          $set: {
            updatedAt: new Date()
          }
        },
        {
          upsert: true
        },
        (error) => {
          if (error) {
            return reject(error);
          }
          resolve();
        }
      );
    })
  }

  /**
   * @param identifier
   * @param action
   * @param target
   */
  async disallow(identifier, action, target) {
    const collection = await this.getCollection();
    return new Promise((resolve, reject) => {
      collection.deleteOne(
        {
          identifier,
          action,
          target
        },
        (error) => {
          if (error) {
            return reject(error);
          }
          resolve();
        }
      )
    });
  }

  /**
   * @param identifier
   * @param action
   * @param target
   * @returns {boolean}
   */
  async can(identifier, action, target) {
    const collection = await this.getCollection();
    const count = await new Promise((resolve, reject) => {
      collection.count(
        {
          identifier,
          action,
          target
        },
        {
          limit: 1
        },
        (error, count) => {
          if (error) {
            return reject(error);
          }
          return resolve(count);
        }
      )
    });
    return count > 0;
  }
}

class WhoCanMongoDB extends WhoCan {

  /**
   * @param {{collection: function}|*} database
   * @param {WhoCanMongoDBOptions} [options={}]
   */
  constructor(database, options) {
    super(new WhoCanMongoDBBacker(database, options), options);
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async getOptions(identifier, actions, target, ...rest) {
    return super.getOptions(identifier, actions, target, ...rest);
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async allow(identifier, actions, target, ...rest) {
    return super.allow(identifier, actions, target, ...rest);
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async disallow(identifier, actions, target, ...rest) {
    return super.disallow(identifier, actions, target, ...rest);
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   * @returns {boolean}
   */
  async can(identifier, actions, target, ...rest) {
    return super.can(identifier, actions, target, ...rest);
  }

}

module.exports = WhoCanMongoDB;
module.exports.WhoCanMongoDBBacker = WhoCanMongoDBBacker;

/**
 * @typedef {WhoCanOptions} WhoCanMongoDBOptions
 * @property {string} [collection='who-can']
 */