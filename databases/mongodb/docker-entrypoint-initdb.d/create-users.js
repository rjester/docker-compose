/*
  Initialization script executed by MongoDB image on first startup.
  It creates an application database and a readWrite user based on environment variables.

  Environment variables used (set in .env):
    MONGO_INITDB_ROOT_USERNAME
    MONGO_INITDB_ROOT_PASSWORD
    MONGO_INITDB_DATABASE       - name of application database to create (optional)
    MONGO_INITDB_USER           - application user (optional)
    MONGO_INITDB_PASSWORD       - application user password (optional)

  This script is safe to include; the MongoDB entrypoint runs scripts in this
  folder only when the database is initialized for the first time.
*/

// Idempotent init script: creates app DB and user only if the user doesn't exist.
(function() {
  if (!process.env.MONGO_INITDB_DATABASE) {
    print('No MONGO_INITDB_DATABASE set; skipping application user creation.');
    return;
  }

  const appDbName = process.env.MONGO_INITDB_DATABASE;
  const appUser = process.env.MONGO_INITDB_USER || 'appuser';
  const appPass = process.env.MONGO_INITDB_PASSWORD || 'apppassword';

  const appDB = db.getSiblingDB(appDbName);

  print('Checking application database/user: ' + appDbName + ' / ' + appUser);
  try {
    const existing = appDB.getUser(appUser);
    if (existing) {
      print('User exists, skipping creation.');
      return;
    }

    print('Creating user ' + appUser + ' on ' + appDbName);
    appDB.createUser({
      user: appUser,
      pwd: appPass,
      roles: [ { role: 'readWrite', db: appDbName } ]
    });
    print('Created user ' + appUser + ' on ' + appDbName);
  } catch (e) {
    print('Error creating app user: ' + e);
  }
})();
