const uuid = require("uuid/v4");
require("nodejs-dashboard");

var EventBroker = (exports.EventBroker = function EventBroker() {
  this.subjects = {};
});

EventBroker.prototype.subscribe = function(subject, callback) {
  this.get(subject).push(callback);
};

EventBroker.prototype.create = function(subject) {
  this.subjects[subject] = [];
};

EventBroker.prototype.get = function(subject) {
  if (!this.has(subject)) {
    throw new Error("Subject Not Found: " + subject);
  }

  return this.subjects[subject];
};

EventBroker.prototype.has = function(subject) {
  return this.subjects.hasOwnProperty(subject);
};

EventBroker.prototype.publish = function(subject) {
  var subscribers = this.get(subject),
    args = Array.prototype.slice.call(arguments, 1);

  args.splice(0, 0, null);

  for (var i = -1, len = subscribers.length; ++i < len; ) {
    setTimeout(Function.prototype.bind.apply(subscribers[i], args), 0);
  }
};

function Observable() {
  this.events = new EventBroker();
  this.on = this.events.subscribe.bind(this.events);
}

module.exports = {
  Observable: Observable,
  EventBroker: EventBroker
};

var events = new EventBroker();

const node = ({ parent, arr, Ob, unit, fn, root = false }) => {
  if (arr.length === 0) {
    if (root) {
      events.subscribe(Ob, async () => {
        events.publish(parent, unit);
      });
    }
  } else if (arr.length === 1) {
    const [first] = arr;
    events.subscribe(Ob, async () => {
      events.publish(parent, root ? await fn(unit, first) : fn(first));
    });
  } else if (arr.length === 2) {
    const [first, second] = arr;
    events.subscribe(Ob, async () => {
      events.publish(
        parent,
        root ? await fn(first, second) : fn(await fn(first, second))
      );
    });
  } else {
    const [first, ...rest] = arr;
    let acc = null;
    const p = uuid();
    events.create(p);
    events.subscribe(p, async ff => {
      if (acc) events.publish(parent, root ? await ff(acc) : fn(await ff(acc)));
      else acc = await ff(first);
    });
    const half =
      rest.length % 2 === 0 ? rest.length / 2 : (rest.length - 1) / 2;
    node({ parent: p, arr: rest.slice(half), unit: unit, Ob: Ob, fn: fn }); //left
    node({ parent: p, arr: rest.slice(0, half), unit: unit, Ob: Ob, fn: fn }); //right
  }
};

const createNode = (Obr, Ob, unit, init, fn) => {
  node({ parent: Obr, arr: init, Ob: Ob, unit: unit, root: true, fn: fn });
};

const run = fn => (unit, array) => {
  return new Promise((resolve, reject) => {
    const result = uuid();
    const ob = uuid();
    events.create(`${result}`);
    events.create(`${ob}`);
    events.subscribe(`${result}`, r => resolve(r));
    createNode(`${result}`, `${ob}`, unit, array, fn);
    events.publish(`${ob}`, fn);
  });
};

function curry(f, a = []) {
  return (...p) =>
    (o => (o.length >= f.length ? f(...o) : curry(f, o)))([...a, ...p]);
}

const fn = async (a, b) => a + b;

// run(curry(fn))(0, []).then(console.log);
// run(curry(fn))(0, [1]).then(console.log);
// run(curry(fn))(0, [1, 2]).then(console.log);

const ar = [];
for (var i = 0; i < 10000; i++) {
  ar.push(1);
}

console.time("time");
run(curry(fn))(0, ar)
  .then(console.log)
  .then(() => console.timeEnd("time"));

// console.time("time2");
// console.log(ar.reduce((acc, current) => acc + current));
// console.timeEnd("time2");

// run(curry(fn))(0, [
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1,
//   1
// ]).then(console.log);
