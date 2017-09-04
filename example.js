const WhoCan = require('./index'),
  MongoDB = require('mongodb');

MongoDB.connect('mongodb://localhost/default', async function(error, database) {
  if (error) {
    return console.error(error);
  }

  const can = new WhoCan(database);

  async function purchaseBook(user, book) {
    await can.allow(user.id, 'take', book.id);
  }

  async function takeBook(user, book) {
    if (!await can.can(user.id, 'take', book.id)) {
      throw new Error('Please puchase the book');
    }
    return book;
  }

  const user = {
      id: '0d399b15-cad4-4c85-b892-15a14fd40a48'
    },
    book = {
      id: 'b3111978-3a1a-416f-979c-d21a8b4365c6'
    };

  await purchaseBook(user, book)
    .then(() => takeBook(user, book))
    .then(() => console.log('I have the book!'))
    .catch(() => console.error('Should have brought the book first!'));

  process.exit(0);
});