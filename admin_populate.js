import pkg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;
const SALT_ROUNDS = 10;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// admin data and panel assignments remain the same
const admins = [
  { email: "x@vitstudent.ac.in", roll: "11AAA1111" },
  { email: "y@vitstudent.ac.in", roll: "22BBB2222" },

  // 12 total records
];

const panelMap = {
  "A": 1,
  "B": 2,
  "C": 3,
  "D": 4,
};

function formatName(email) {
  let prefix = email.split("@")[0];
  let parts = prefix.split(".");
  parts = parts.map((p) => p.replace(/\d+/g, ""));
  return parts
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// New function for panel seed
async function seedPanels(client) {
  console.log("Deleting existing panels...");
  // truncate panels as well
  await client.query("TRUNCATE TABLE panels RESTART IDENTITY CASCADE");

  console.log("Inserting new panels...");
  const tracksResult = await client.query(
    "SELECT track_id FROM tracks ORDER BY track_id"
  );
  const trackIds = tracksResult.rows.map((row) => row.track_id);

  if (trackIds.length < 7) {
    throw new Error(
      "Not enough tracks in the database to assign to panels. Please run the track import script first."
    );
  }

  // Panel 1: Tracks 1, 2
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 1", trackIds[0], trackIds[1]]
  );
  // Panel 2: Tracks 3, 4
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 2", trackIds[2], trackIds[3]]
  );
  // Panel 3: Tracks 5, 6
  await client.query(
    "INSERT INTO panels (name, track_id) VALUES ($1, $2), ($1, $3)",
    ["Panel 3", trackIds[4], trackIds[5]]
  );
  // Panel 4: Track 7
  await client.query("INSERT INTO panels (name, track_id) VALUES ($1, $2)", [
    "Panel 4",
    trackIds[6],
  ]);

  console.log("Panels created and tracks assigned successfully!");
}

async function seedAdmins() {
  const client = await pool.connect();

  try {
    // UPDATED- Start a transaction
    await client.query("BEGIN");

    // Seed the panels first. Will throw error if it fails
    await seedPanels(client);

    // Proceed with seeding admins
    console.log("Deleting existing admins...");
    await client.query("TRUNCATE TABLE admins RESTART IDENTITY CASCADE");

    console.log("Inserting new admins...");
    for (const admin of admins) {
      const email = admin.email;
      const roll = admin.roll;
      const prefix = email.split("@")[0].replace(/\d+/g, "");
      const panel_id = panelMap[prefix] || null;
      const name = formatName(email);

      const hashedPassword = await bcrypt.hash(roll, SALT_ROUNDS);

      await client.query(
        `INSERT INTO admins (name, email, password_hash, panel_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hashedPassword, panel_id, "judge"]
      );

      console.log(
        `Inserted: ${name} (${email}) -> Panel: ${panel_id || "N/A"}`
      );
    }

    // If all steps succeed, commit  transaction
    await client.query("COMMIT");
    console.log("Full seeding completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during seeding process:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seedAdmins();
