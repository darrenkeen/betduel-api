const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db.js');

const app = express();
const port = 4000;

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/fixtures', (req, res) => {
  var sql = 'select * from fixtures';
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ message: err?.message || 'error' });
      return;
    }
    res.json({
      message: 'success',
      data: rows,
    });
  });
});

app.post('/betslip/create', (req, res) => {
  const data = {
    stake: req.body.stake,
    returns: req.body.returns,
    picks: req.body.picks,
  };
  var sql = 'INSERT INTO betslip (stake, returns) VALUES(?,?)';
  var params = [data.stake, data.returns];
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(400).json({ message: err?.message || 'error' });
    }
    let picks = data.picks.map((pick) => ({
      fixtureId: pick.fixtureId,
      selection: pick.selection,
      betslipId: this.lastID,
    }));

    let picksPlaceholder = picks.map(() => '(?, ?, ?)').join(', ');
    let picksQuery =
      'INSERT INTO picks ("fixtureId", selection, "betslipId") VALUES ' +
      picksPlaceholder;
    let flatPicks = [];
    picks.forEach((arr) => {
      Object.values(arr).forEach((item) => {
        flatPicks.push(item);
      });
    });

    const bId = this.lastID;

    db.serialize(function () {
      db.run(picksQuery, flatPicks, function (err) {
        if (err) {
          res.status(400).json({ message: err?.message || 'error' });
          return;
        }
        db.all(
          `select p.betslipId, b.stake, b.returns, p.selection, f.homeTeam, f.awayTeam, f.homeOdds, f.awayOdds, f.drawOdds from betslip b INNER JOIN picks p ON p.betslipId = b.id INNER JOIN fixtures f ON f.id = p.fixtureId WHERE b.id = ${bId}`,
          (error, rows) => {
            if (error) {
              console.error(error);
              res.status(400).json({ message: err?.message || 'error' });
              return;
            }
            const data = rows.length > 0 ? getBetslipData(rows) : null;
            res.json({
              message: 'success',
              data,
            });
            return;
          }
        );
      });
    });
  });
});

app.get('/picks', (req, res) => {
  var sql = 'select * from picks';
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ message: err?.message || 'error' });

      return;
    }
    res.json({
      message: 'success',
      data: rows,
    });
  });
});

app.get('/betslip/:id', (req, res) => {
  var sql = `select p.betslipId, b.stake, b.returns, p.selection, f.homeTeam, f.awayTeam, f.homeOdds, f.awayOdds, f.drawOdds from betslip b INNER JOIN picks p ON p.betslipId = b.id INNER JOIN fixtures f ON f.id = p.fixtureId WHERE b.id = ${req.params.id}`;
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ message: err?.message || 'error' });
      return;
    }
    const data = rows.length > 0 ? getBetslipData(rows) : null;
    res.json({
      message: 'success',
      data,
    });
  });
});

app.delete('/betslip/:id', (req, res) => {
  var sql = `delete from picks where betslipId=${req.params.id}`;
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ message: err?.message || 'error' });
      return;
    }
    res.json({
      message: 'success',
    });
  });
});

app.get('/betslip', (req, res) => {
  var sql =
    'select p.betslipId, b.stake, b.returns, p.selection, f.homeTeam, f.awayTeam, f.homeOdds, f.awayOdds, f.drawOdds from betslip b INNER JOIN picks p ON p.betslipId = b.id INNER JOIN fixtures f ON f.id = p.fixtureId';
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ message: err?.message || 'error' });

      return;
    }
    const data = rows.length > 0 ? getBetslipData(rows, true) : null;
    res.json({
      message: 'success',
      data,
    });
  });
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

function getBetslipData(rows, isAll = false) {
  if (isAll) {
    return rows.reduce((prev, curr) => {
      if (prev.length === 0) {
        prev.push({
          betslipId: curr.betslipId,
          stake: curr.stake,
          returns: curr.returns,
          picks: [
            {
              selection: curr.selection,
              fixture: {
                homeTeam: curr.homeTeam,
                awayTeam: curr.awayTeam,
                homeOdds: curr.homeOdds,
                awayOdds: curr.awayOdds,
                drawOdds: curr.drawOdds,
              },
            },
          ],
        });
        return prev;
      }

      const existsInd = prev.findIndex((p) => p.betslipId === curr.betslipId);
      if (existsInd > -1) {
        prev[existsInd].picks.push({
          selection: curr.selection,
          fixture: {
            homeTeam: curr.homeTeam,
            awayTeam: curr.awayTeam,
            homeOdds: curr.homeOdds,
            awayOdds: curr.awayOdds,
            drawOdds: curr.drawOdds,
          },
        });
        return prev;
      }

      prev.push({
        betslipId: curr.betslipId,
        stake: curr.stake,
        returns: curr.returns,
        picks: [
          {
            selection: curr.selection,
            fixture: {
              homeTeam: curr.homeTeam,
              awayTeam: curr.awayTeam,
              homeOdds: curr.homeOdds,
              awayOdds: curr.awayOdds,
              drawOdds: curr.drawOdds,
            },
          },
        ],
      });
      return prev;
    }, []);
  } else {
    return {
      betslipId: rows[0].betslipId,
      stake: rows[0].stake,
      returns: rows[0].returns,
      picks: rows.map((row) => ({
        selection: row.selection,
        fixture: {
          homeTeam: row.homeTeam,
          awayTeam: row.awayTeam,
          homeOdds: row.homeOdds,
          awayOdds: row.awayOdds,
          drawOdds: row.drawOdds,
        },
      })),
    };
  }
}
