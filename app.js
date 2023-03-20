const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

/// Get States API
const convertStatesCaseToSnakeCase = (eachState) => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT *
        FROM state
    `;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertStatesCaseToSnakeCase(eachState))
  );
});

/// Get State API
const covertSingleStateCaseToSnakeCase = (eachState) => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  };
};

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT *
        FROM state
        WHERE state_id = ${stateId};
    `;
  const singleState = await db.all(getStateQuery);
  response.send(
    singleState.map((newState) => covertSingleStateCaseToSnakeCase(newState))
  );
});

/// Add District API
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
        INSERT INTO district (district_name, state_id, cases, cured, active, deaths )
        VALUES (
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths}
        );
    `;
  const dbResponse = await db.run(addDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

/// Get District API
const convertDistrictCaseToSnakeCase = (newDistrict) => {
  return {
    districtId: newDistrict.district_id,
    districtName: newDistrict.district_name,
    stateId: newDistrict.state_id,
    cases: newDistrict.cases,
    cured: newDistrict.cured,
    active: newDistrict.active,
    deaths: newDistrict.deaths,
  };
};

app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
        SELECT *
        FROM district
        WHERE district_id = ${districtId};
    `;
  const singleDistrict = await db.all(getDistrictQuery);
  response.send(
    singleDistrict.map((newDistrict) =>
      convertDistrictCaseToSnakeCase(newDistrict)
    )
  );
});

/// Delete District API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
        DELETE FROM district
        WHERE district_id = ${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

/// Update District API
app.put("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE district_id = ${districtId};
  `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

/// GET Stats API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
        SELECT
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM district
        WHERE state_id = ${stateId};
    `;
  const statsArray = await db.get(getStatsQuery);
  response.send({
    totalCases: statsArray["SUM(cases)"],
    totalCured: statsArray["SUM(cured)"],
    totalActive: statsArray["SUM(active)"],
    totalDeaths: statsArray["SUM(deaths)"],
  });
});

/// Get State Names API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
        SELECT state_id
        FROM district
        WHERE district_id = ${districtId};
    `;
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);
  const getStateNamesQuery = `
    SELECT state_name AS stateName
    FROM state
    WHERE state_id = ${getDistrictIdQueryResponse.state_id};
  `;
  const stateNamesArray = await db.get(getStateNamesQuery);
  response.send(stateNamesArray);
});

module.exports = app;
