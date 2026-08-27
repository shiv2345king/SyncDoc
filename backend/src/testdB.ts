
import dotenv from "dotenv";
import  dbConnect  from "./db/dbConnect";
const result = dotenv.config();
async function testDBConnection() {
    try {
        await dbConnect();
        console.log("Database connection test successful.");
    }
    catch (error) {
        console.error("Database connection test failed:", error);
    }
}

testDBConnection();