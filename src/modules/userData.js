const db = require('../db');
const { Collection, User, GuildMember, Message } = require('discord.js');
const userDataCollection = new Collection();

async function resolveUserId(user) {
  if (user instanceof Function) user = await user();
  if (user instanceof GuildMember || user instanceof User) return user.id;
  if (user instanceof Message) return user.author.id;
  if (typeof user === 'string' && user.match(/^\d+$/)) return user;
  throw new Error('User is not a user object or user id');
}

const saveUserStmt = db.prepare('INSERT OR REPLACE INTO users (user, data) VALUES (?, ?)');
const fetchUserStmt = db.prepare('SELECT data FROM users WHERE user = ?');

function saveUser(userId) {
  const user = fetchUser(userId);
  saveUserStmt.run(userId, JSON.stringify(user));
}

function fetchUser(userId) {
  if(userDataCollection.has(userId)) return userDataCollection.get(userId);

  const data = JSON.parse(fetchUserStmt.get(userId) || { data: '{}'}.data);
  userDataCollection.set(userId, data);
  return data;
}

async function getData(user) {
  const userId = await resolveUserId(user);
  return await fetchUser(userId);
}

async function getProp(user, prop, defValue) {
  if(prop instanceof Function) prop = await prop();
  if(typeof prop !== 'string') throw new Error('Property must be string.');
  const data = await getData(user);
  if(!data.hasOwnProperty(prop)) return defValue;
  return data[prop];
}

async function setData(user, data) {
  const userId = await resolveUserId(user);
  if(data && data instanceof Function) data = data(userId);
  if(!data || data.constructor !== Object) throw new Error(`Data must be object. Got: ${data ? String(data) : data.constructor.name}`);
  userDataCollection.set(userId, data);
  await saveUser(userId);
}

async function setProp(user, prop, value) {
  if(prop instanceof Function) prop = await prop();
  if(typeof prop !== 'string') throw new Error('Property must be string.');
  const userId = await resolveUserId(user);
  const data = await fetchUser(userId);
  data[prop] = value;
  await saveUser(userId);
}

async function clearCache(user) {
  if(!user) {
    userDataCollection.clear();
    return true;
  }
  return userDataCollection.delete(await resolveUserId(user));
}

module.exports = {
  getData,
  setData,
  getProp,
  setProp,
  clearCache,
};
