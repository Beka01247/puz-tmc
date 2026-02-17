// Debug script to check users in database
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { users } = require("./db/schema");

async function checkUsers() {
  try {
    // You'll need to replace this with your actual database connection string
    const sql = postgres(process.env.NEON_DB_URL || "your-connection-string");
    const db = drizzle(sql);

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        iin: users.iin,
        userType: users.userType,
        doctorType: users.doctorType,
        fullName: users.fullName,
      })
      .from(users);

    console.log("All users in database:");
    console.table(allUsers);

    await sql.end();
  } catch (error) {
    console.error("Error querying database:", error);
  }
}

checkUsers();
