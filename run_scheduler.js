import Joi from "joi";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

function assignPanelsToTeams(panels, teams) {
  const panelSchema = Joi.object({ panel_id: Joi.number().required() });
  const teamSchema = Joi.object({
    team_id: Joi.number().required(),
    track_id: Joi.number().required(),
  });
  const panelsSchema = Joi.array().items(panelSchema).min(1).required(); // Allow for any number of panels
  const teamsSchema = Joi.array().items(teamSchema).required();

  const { error: panelsError } = panelsSchema.validate(panels);
  if (panelsError)
    throw new Error(`Invalid panels input: ${panelsError.message}`);

  const { error: teamsError } = teamsSchema.validate(teams);
  if (teamsError) throw new Error(`Invalid teams input: ${teamsError.message}`);

  if (teams.length === 0) return [];
  if (panels.length === 0)
    throw new Error("No panels available to assign teams to.");

  // simple roundrobin assignment for standalone script
  const assignments = teams.map((team, index) => {
    const panelIndex = index % panels.length;
    const assignedPanel = panels[panelIndex];
    return { team_id: team.team_id, panel_id: assignedPanel.panel_id };
  });

  return assignments;
}

// standalone script execute
async function runScript() {
  console.log("Starting panel assignment script...");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  console.log(" Successfully connected to the database.");

  try {
    await client.query("BEGIN");
    console.log("Fetching panels and teams from the database...");

    // Fetch all panels
    const panelsRes = await client.query(
      "SELECT panel_id FROM panels ORDER BY panel_id"
    );
    const panels = panelsRes.rows;
    if (!panels.length) {
      throw new Error(
        "No panels found in the database. Please run the admin seeder first."
      );
    }

    // Fetch all teams that don't have panel yet
    const teamsRes = await client.query(
      "SELECT team_id, track_id FROM teams WHERE panel_id IS NULL ORDER BY created_at ASC"
    );
    const teams = teamsRes.rows;
    if (!teams.length) {
      console.log("No teams found that need panel assignment. Exiting.");
      return;
    }

    console.log(
      `Found ${panels.length} panels and ${teams.length} teams to assign.`
    );

    // Run assignment logic
    const assignments = assignPanelsToTeams(panels, teams);
    console.log(" Generated panel assignments...");

    // Update teams table with the new panel_id
    for (const { team_id, panel_id } of assignments) {
      await client.query("UPDATE teams SET panel_id = $1 WHERE team_id = $2", [
        panel_id,
        team_id,
      ]);
    }

    // If succeeded, commit changes
    await client.query("COMMIT");
    console.log(
      `Successfully assigned ${assignments.length} teams to panels!`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(
      " An error occurred. Rolling back all database changes.",
      err
    );
  } finally {
    client.release();
    await pool.end();
    console.log(" Database connection closed.");
  }
}

runScript();
