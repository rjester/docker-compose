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

  // Validate credentials to avoid StringPrep normalization errors (U_STRINGPREP_PROHIBITED_ERROR).
  // Restrict to printable ASCII characters to be safe for SASLprep/stringprep used by MongoDB internals.
  function isPrintableAscii(s) {
    return typeof s === 'string' && /^[\x20-\x7E]+$/.test(s);
  }

  if (!isPrintableAscii(appUser)) {
    print('Refusing to create user: MONGO_INITDB_USER contains non-printable or prohibited characters.');
    print('Suggested fix: set a username with only printable ASCII characters (e.g. letters, digits, punctuation).');
    throw new Error('Invalid characters in MONGO_INITDB_USER');
  }

  if (!isPrintableAscii(appPass)) {
    print('Refusing to create user: MONGO_INITDB_PASSWORD contains non-printable or prohibited characters.');
    print('Suggested fix: set a password containing only printable ASCII characters (avoid emojis, control chars, and certain unicode).');
    throw new Error('Invalid characters in MONGO_INITDB_PASSWORD');
  }

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
    // Re-throw so Docker logs show a non-zero exit from the script and the issue is visible.
    throw e;
  }
})();
