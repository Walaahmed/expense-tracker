export const findUserByEmail = (db, email) =>
  db.get('SELECT * FROM users WHERE email = ?', [email]);

export const findUserById = (db, id) =>
  db.get('SELECT id, name, email FROM users WHERE id = ?', [id]);

export const createUser = (db, { name, email, passwordHash }) =>
  db.get('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id, name, email', [
    name,
    email,
    passwordHash,
  ]);
