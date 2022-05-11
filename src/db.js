var sqlite3 = require('sqlite3').verbose();

const DBSOURCE = 'db.sqlite';

let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  db.run(
    `CREATE TABLE fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "homeTeam" text, 
      "awayTeam" text, 
      "homeOdds" DECIMAL(5,2), 
      "awayOdds" DECIMAL(5,2), 
      "drawOdds" DECIMAL(5,2)
    )`,
    (err) => {
      if (err) {
        console.log('Fixtures table exists');
      } else {
        var insert =
          'INSERT INTO fixtures ("homeTeam", "awayTeam", "homeOdds", "awayOdds", "drawOdds") VALUES (?,?,?,?,?)';
        db.run(insert, ['Arsenal', 'Chelsea', 1.5, 6.25, 4.5]);
        db.run(insert, ['Real Madrid', 'Ajax', 1.4, 4.33, 8]);
        db.run(insert, ['Brazil', 'Scotland', 4, 1.75, 3.4]);
        db.run(insert, ['FanDuel', 'Draft Kings', 1.2, 11, 6]);

        db.run(
          `CREATE TABLE betslip (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stake DECIMAL(5,2),
            returns DECIMAL(5, 2)
          )`,
          (err) => {
            if (err) {
              console.log('Betslip table exists');
            } else {
              db.run(
                `CREATE TABLE picks (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  "fixtureId" INTEGER,
                  "betslipId" INTEGER,
                  selection TEXT,
                  FOREIGN KEY("fixtureId") REFERENCES fixtures(id),
                  FOREIGN KEY("betslipId") REFERENCES betslip(id)
                )`,
                (err) => {
                  if (err) {
                    console.log('Picks table exists');
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

module.exports = db;
